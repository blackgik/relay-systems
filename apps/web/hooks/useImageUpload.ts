'use client';

import { useState } from 'react';
import { compressImageFile, notify, processFileToDataURL } from '@/utils';

export interface FileUploadValidatorProps {
  sizeInMb?: number;
  fileTypes?: string[];
}

export interface FileUploadFileDetailsProps {
  name: string;
  size: number;
  type: string;
}

const useImageUpload = (
  updateFileHandler: (file: string, fileDetails: FileUploadFileDetailsProps) => void = () => {},
  validators?: FileUploadValidatorProps,
  /** When given, validation messages go here (e.g. shown inline) instead of a toast. */
  onInvalidFile?: (message: string) => void
) => {
  const [selectedFile, setSelectedFile] = useState('');
  const [fileName, setFileName] = useState('');

  /**
   * Compress, validate, then hand the file up as a data URL. Shared by the
   * file-input and drag-and-drop paths so both get the same treatment — the
   * drop path used to skip compression entirely.
   *
   * Downscaling happens before validation so a large photo straight off a
   * phone is compressed to fit rather than rejected for being too big.
   * Non-images and anything the browser can't re-encode come back unchanged.
   */
  const handleSelectedFile = async (originalFile?: File) => {
    if (!originalFile) return false;

    const { sizeInMb = 1 } = validators || {};
    const file = await compressImageFile(originalFile, { maxSizeMb: sizeInMb });

    const isValid = validateSelectedFile(file);
    if (!isValid) return false;

    setFileName(file.name);

    processFileToDataURL(file, (processedFile) =>
      saveSelectedFile(processedFile, { name: file.name, size: file.size, type: file.type })
    );

    return true;
  };

  // Handles business logo
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    await handleSelectedFile(file);
    // File inputs can only be set programmatically to "". Binding the fakepath
    // (or a data URL) as `value` throws InvalidStateError.
    e.target.value = '';
    setSelectedFile('');
  };

  // Saves file to store and to hook form
  const saveSelectedFile = (
    fileData: string | ArrayBuffer | null,
    fileDetails: FileUploadFileDetailsProps
  ) => {
    if (!fileData) return;

    const dataURL = String(fileData);
    updateFileHandler(dataURL, fileDetails);
  };

  // Validates selected logo props
  const validateSelectedFile = (
    file: File | undefined,
    fileValidators?: FileUploadValidatorProps
  ) => {
    const errorMessage = 'Error attaching file.';

    const { sizeInMb = 1, fileTypes = ['image'] } = fileValidators || validators || {};

    if (!file) {
      return false;
    }

    const reject = (subtitle: string) => {
      if (onInvalidFile) onInvalidFile(subtitle);
      else notify.error({ message: errorMessage, subtitle });
      return false;
    };

    if (file?.size && file.size >= sizeInMb * 1024 * 1024) {
      return reject(`The file is too large. Should be less than ${sizeInMb}MB.`);
    }

    const fileTypeIsValid = fileTypes.some((type) => file.type.includes(type));

    if (file?.type && !fileTypeIsValid) {
      return reject(`Only ${fileTypes.join(', ')} file types are accepted.`);
    }

    return true;
  };

  return {
    handleFileInputChange,
    handleSelectedFile,
    selectedFile,
    setSelectedFile,
    validateSelectedFile,
    fileName,
  };
};

export default useImageUpload;
