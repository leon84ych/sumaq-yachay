import { toJpeg } from 'html-to-image';

export interface JpegDownloadOptions {
  backgroundColor?: string;
}

export async function downloadJpeg(
  element: HTMLElement,
  filename: string,
  options: JpegDownloadOptions = {},
): Promise<void> {
  const originalStyle = element.getAttribute('style');
  const computedColor = getComputedStyle(element).color;
  element.style.position = 'fixed';
  element.style.left = '0px';
  element.style.top = '0px';
  element.style.opacity = '0';
  element.style.pointerEvents = 'none';

  // Usamos Parameters<typeof toJpeg>[1] para extraer el tipo de configuración interno sin importarlo directamente
  const htmlToImageOptions: Parameters<typeof toJpeg>[1] = {
    pixelRatio: 2,
    quality: 0.95,
    backgroundColor: options.backgroundColor ?? '#1a1a1a',
    width: 500,
    height: 500,
    style: {
      position: 'relative',
      left: '0px',
      top: '0px',
      margin: '0',
      opacity: '1',
      color: computedColor,
      webkitTextFillColor: computedColor,
    },
    skipFonts: true,
    filter: (node: HTMLElement) =>
      !(node instanceof Element && node.matches('.download-image-btn, .quote-card-header')),
  };

  try {
    const dataUrl = await toJpeg(element, htmlToImageOptions);

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
    link.remove(); // Limpieza del nodo del DOM temporal
  } catch (error) {
    console.error('Error rendering or downloading the JPEG image:', error);
    throw error;
  } finally {
    if (originalStyle === null) {
      element.removeAttribute('style');
    } else {
      element.setAttribute('style', originalStyle);
    }
  }
}
