/**
 * Collection Form Validation
 * Quick Win P1-3: Extract validation from CollectionFormDialog.tsx
 */

export interface CollectionFormState {
  name: string;
  description: string;
  directory: string;
  embeddingModel: string;
  fileTypes: string[];
  recursive?: boolean;
  autoSync?: boolean;
  [key: string]: any;
}

export interface FormErrors {
  name?: string;
  description?: string;
  directory?: string;
  embeddingModel?: string;
  fileTypes?: string;
  [key: string]: string | undefined;
}

export function validateCollectionForm(data: CollectionFormState): FormErrors {
  const errors: FormErrors = {};

  // Name validation
  if (!data.name || data.name.trim() === "") {
    errors.name = "Nome é obrigatório";
  } else if (data.name.length < 3) {
    errors.name = "Nome deve ter pelo menos 3 caracteres";
  } else if (data.name.length > 50) {
    errors.name = "Nome deve ter no máximo 50 caracteres";
  } else if (!/^[a-zA-Z0-9-_]+$/.test(data.name)) {
    errors.name =
      "Nome deve conter apenas letras, números, hífens e underscores";
  }

  // Directory validation
  if (!data.directory || data.directory.trim() === "") {
    errors.directory = "Diretório é obrigatório";
  }

  // Model validation
  if (!data.embeddingModel || data.embeddingModel.trim() === "") {
    errors.embeddingModel = "Modelo de embedding é obrigatório";
  }

  // File types validation
  if (!data.fileTypes || data.fileTypes.length === 0) {
    errors.fileTypes = "Selecione pelo menos um tipo de arquivo";
  }

  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function getErrorMessage(errors: FormErrors): string {
  const messages = Object.values(errors).filter(Boolean);
  return messages.join(", ");
}
