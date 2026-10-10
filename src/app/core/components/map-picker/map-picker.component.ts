import { Component, AfterViewInit, OnDestroy, input, output, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container-wrapper">
      <div #mapContainer class="leaflet-map"></div>
    </div>
  `,
  styles: [`
    .map-container-wrapper {
      width: 100%;
      height: 300px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
      margin-top: 0.5rem;
    }
    .leaflet-map {
      width: 100%;
      height: 100%;
      z-index: 1;
    }
  `]
})
export class MapPickerComponent implements AfterViewInit, OnDestroy {
  // Coordenadas iniciales [lat, lng] (por defecto centro genérico o de la obra)
  readonly initialCoords = input<[number, number]>([0, 0]);
  readonly zoom = input<number>(6);
  
  // Si es true, permite hacer clic para mover un pin y emitir coordenadas
  readonly interactive = input<boolean>(true);
  
  // Lista opcional de marcadores múltiples para visualización global
  readonly markers = input<{ lat: number; lng: number; title: string; color?: string }[]>();

  // Evento que emite las coordenadas seleccionadas al hacer clic
  readonly coordinatesChange = output<string>();

  private mapElement = viewChild.required<ElementRef>('mapContainer');
  private map?: L.Map;
  private currentMarker?: L.Marker;
  private groupMarkers: L.LayerGroup = L.layerGroup();

  constructor() {
    // Reacciona si cambian las coordenadas iniciales externamente
    effect(() => {
      const coords = this.initialCoords();
      if (this.map && coords) {
        this.updateMainMarker(coords[0], coords[1]);
      }
    });

    // Reacciona si se pasan múltiples marcadores (modo visualización global)
    effect(() => {
      const allMarkers = this.markers();
      if (this.map && allMarkers) {
        this.renderAllMarkers(allMarkers);
      }
    });
  }

  ngAfterViewInit(): void {
    const [lat, lng] = this.initialCoords();
    
    // Inicializar mapa de OpenStreetMap
    this.map = L.map(this.mapElement().nativeElement).setView([lat, lng], this.zoom());

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.groupMarkers.addTo(this.map);

    // Si es interactivo, permitir clic para seleccionar ubicación
    if (this.interactive()) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        this.updateMainMarker(lat, lng);
        // Emitir en formato plano "lat, lng" compatible con el campo coordinates de Places
        this.coordinatesChange.emit(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      });
    }

    // Solución al problema común de renderizado gris en contenedores ocultos/modales
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 150);
  }

  private updateMainMarker(lat: number, lng: number): void {
    if (!this.map) return;
    
    if (this.currentMarker) {
      this.currentMarker.setLatLng([lat, lng]);
    } else {
      this.currentMarker = L.marker([lat, lng], { draggable: this.interactive() }).addTo(this.map);
      
      if (this.interactive()) {
        this.currentMarker.on('dragend', (event) => {
          const marker = event.target;
          const position = marker.getLatLng();
          this.coordinatesChange.emit(`${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`);
        });
      }
    }
    this.map.setView([lat, lng], this.map.getZoom());
  }

  private renderAllMarkers(items: { lat: number; lng: number; title: string; color?: string }[]): void {
    this.groupMarkers.clearLayers();
    
    items.forEach(item => {
      // Crear un marcador personalizado utilizando el color del dominio si existe
      const markerHtml = `
        <div style="
          background-color: ${item.color || '#3b82f6'};
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 4px rgba(0,0,0,0.4);
        "></div>
      `;
      
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: markerHtml,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([item.lat, item.lng], { icon: customIcon });
      marker.bindPopup(`<b>${item.title}</b>`);
      this.groupMarkers.addLayer(marker);
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}