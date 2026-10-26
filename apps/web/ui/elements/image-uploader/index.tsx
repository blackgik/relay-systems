'use client';

import React, { useRef } from 'react';
import clsx from 'clsx';
import Image from 'next/image';
import useImageUpload, { FileUploadValidatorProps } from '@/hooks/useImageUpload';
import { User as UserFallbackIcon } from 'lucide-react';
import { NotifErrorIcon as ImageDelIcon, EmptyUploadIcon as EmptyUploadFiller , UploadCircleIcon as UploadIcon } from '@/ui/elements/icon/app-icons';

export type AvatarColorStyle = {
  backgroundColor: string,
  color: string
}

export type ImageUploaderProps = {
  imageUrl?: string;
  setImageUrl?: (file: string) => void;
  validators?: FileUploadValidatorProps;
  className?: string;
  imageAlt?: string;
  id?: string;
  isUserAvatar?: boolean;
  avatarColor?: AvatarColorStyle;
  avatarName?: string;
  isRounded?: boolean;
  imgStyle?: string;
  /** Receives validation messages instead of the default toast (for inline errors). */
  onInvalidFile?: (message: string) => void;
  /** Shown in place of the default icon when there is no image (e.g. initials). */
  emptyContent?: React.ReactNode;
  /** Accessible name for the hidden file input. */
  inputAriaLabel?: string;
  /** Drops the delete badge drawn over the image, for callers with their own remove control. */
  hideRemoveOverlay?: boolean;
}

const ImageUploader = ({
  imageUrl,
  setImageUrl,
  className,
  validators,
  imageAlt = 'business logo',
  id,
  isUserAvatar, avatarColor, avatarName, isRounded = true, imgStyle, onInvalidFile,
  emptyContent, inputAriaLabel, hideRemoveOverlay
}: ImageUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { handleFileInputChange } = useImageUpload(
    setImageUrl,
    validators,
    onInvalidFile
  );

  return (
    <div className={clsx(`relative z-0 flex flex-col justify-between ${className}`, isUserAvatar ? '' : 'h-[100px] w-[100px]')}>
      {imageUrl && !hideRemoveOverlay && (
        <span className="absolute left-1/2 top-1/2 z-[1] flex h-full w-full -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          {setImageUrl && (
            <ImageDelIcon
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = '';
                setImageUrl('');
              }}
              className="cursor-pointer transition-all hover:scale-125"
            />
          )}
        </span>
      )}

      <label
        htmlFor={id}
        className={clsx(
          'relative flex h-full w-full items-center justify-center',
          setImageUrl && 'cursor-pointer',
          // Follow the shape the image is given, otherwise a round avatar sits
          // on a rounded-square wrapper.
          isRounded ? 'rounded-full' : 'rounded-lg',
          // Dropzone chrome belongs to the empty state. Painting it behind a
          // displayed image put a muted rectangle around every read-only
          // avatar, since MediaAvatar renders this component to show one.
          !isUserAvatar && !imageUrl && 'border-border bg-muted hover:bg-muted/80',
          !isUserAvatar && !imageUrl && setImageUrl && 'border-2 border-dashed'
        )}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            width="100"
            height="100"
            priority={false}
            className={clsx("h-full w-full object-cover", isRounded ? "rounded-full" : "rounded-lg", imgStyle && imgStyle)}
          />
        ) : isUserAvatar ? (
          avatarColor?.backgroundColor ? (
            // TODO: visual size may differ slightly — verify against design (text-3xl was 30px, text-display-s is 40px)
            <div
              className="w-[120px] aspect-square rounded-full uppercase test-center flex items-center justify-center text-display-s"
              style={avatarColor}
            >
              {avatarName}
            </div>
          ) : (
            <span className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-muted">
              <UserFallbackIcon className="h-12 w-12 text-icon-muted" aria-hidden />
            </span>
          )
        ) : emptyContent ? (
          emptyContent
        ) : (
          <EmptyUploadFiller className={'h-[2.25rem] w-[2.25rem]'} />
        )}

        {setImageUrl && <UploadIcon className={clsx("absolute bottom-[-12px] z-modal", isUserAvatar ? "right-[7px] bottom-3" : '-right-3')} />}

        <input
          ref={fileInputRef}
          id={id}
          aria-label={inputAriaLabel}
          type="file"
          accept={validators?.fileTypes?.every((t) => t.includes('/')) ? validators.fileTypes.join(',') : 'image/*'}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={!setImageUrl}
        />
      </label>
    </div>
  );
};

export { ImageUploader };
export * from "./image-uploader-with-crop"
