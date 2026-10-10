import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BrowserAiService {
  readonly isAiAvailable = signal<boolean>('ai' in self && 'languageModel' in (self as any).ai);

  async generateQuestionFromEntry(
    conceptTerm: string,
    definition: string,
    questionType: string,
  ): Promise<string> {
    if (!this.isAiAvailable()) {
      throw new Error('La IA nativa del navegador no está disponible en este entorno.');
    }

    const ai = (self as any).ai;

    // Verificar capacidades del modelo local (Gemini Nano)
    const capabilities = await ai.languageModel.capabilities();
    if (capabilities.available === 'no') {
      throw new Error('El modelo de IA del navegador no está listo o no es compatible.');
    }

    // Crear la sesión del modelo
    const session = await ai.languageModel.create({
      systemPrompt:
        'Eres un tutor académico. Generas preguntas claras para el estudio a partir del contenido proporcionado.',
    });

    try {
      const prompt = `Genera una pregunta de tipo "${questionType}" para evaluar este concepto:
                Término: "${conceptTerm}"
                Definición: "${definition}"

                Escribe solo el enunciado de la pregunta. No incluyas la respuesta ni explicaciones.`;

      const result = await session.prompt(prompt);
      return result.trim();
    } finally {
      session.destroy();
    }
  }
}
