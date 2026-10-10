import { DomainSheetRow } from '../../catalog-detail/models/domain-sheet.model';

export type QuestionType = 'flashcard' | 'multiple-choice' | 'true-false' | 'open';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionRow extends DomainSheetRow {
  // 1. Contenido de la Pregunta
  question: string;                 // El enunciado de la pregunta
  answer: string;                   // Respuesta correcta o explicación
  type: QuestionType;               // Tipo de pregunta
  options?: QuestionOption[];       // Opciones si es de tipo multiple-choice
  
  // 2. Trazabilidad del Dominio de Origen
  sourceDomain: string;             // Ej: 'CONCEPTS', 'CHARACTERS', 'GLOSSARY'
  sourceRowId?: string;             // ID exacto del registro origen (ej: 'concept_17123049')
  sourceTerm?: string;              // Nombre/término de referencia rápida (ej: 'Entropía')
  
  // 3. Ubicación y Contexto
  bookRow?: number;                 // ID del libro en la biblioteca
  bookName?: string;                // Nombre del libro de origen
  page?: string;                    // Página de donde surgió el concepto
  
  // 4. Aprendizaje y Estado
  difficulty?: QuestionDifficulty;  // Dificultad estimada o percibida
  aiGenerated?: boolean;            // true si fue creada por la IA nativa del navegador
  
  // Herencia de DomainSheetRow: id, tags, feed, contributor, syncStatus
}