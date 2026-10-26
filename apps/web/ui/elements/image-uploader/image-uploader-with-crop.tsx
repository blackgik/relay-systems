'use client';
import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import Image from 'next/image';
import useImageUpload from '@/hooks/useImageUpload';
import { User as UserFallbackIcon } from 'lucide-react';
import { DEFAULT_AVATAR_COLORS, getAvatarInitials } from '@/utils';
import { AvatarColorStyle, ImageUploaderProps } from '.';
import { CropModal } from './crop-modal';
import { Button } from '../button';
import { Popover } from '../popover';
import { NotifErrorIcon as ImageDelIcon , UploadCircleIcon as UploadIcon } from '@/ui/elements/icon/app-icons';

type ImageUploaderWithCropProps = Omit<ImageUploaderProps, "isUserAvatar"> & {
  title?: string;
  selectedColor: AvatarColorStyle;
  setSelectedColor: (file: AvatarColorStyle) => void
};

const ImageUploaderWithCropFeature = ({
  imageUrl,
  setImageUrl,
  className,
  validators,
  imageAlt = 'profile picture',
  id,
  avatarColor,
  avatarName,
  isRounded = true,
  imgStyle,
  selectedColor,
  setSelectedColor,
  title
}: ImageUploaderWithCropProps) => {
  const { setSelectedFile } = useImageUpload(
    setImageUrl,
    validators
  );

  const hideProfileTitle = !imageUrl && !avatarColor?.backgroundColor;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingImageSrc(ev.target?.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleCropSave = (croppedDataUrl: string) => {
    setCropOpen(false);
    setPendingImageSrc(null);
    setImageUrl?.(croppedDataUrl);
  };

  const handleCropCancel = () => {
    setCropOpen(false);
    setPendingImageSrc(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Avatar display */}
      <div className={clsx(`relative z-0 flex flex-col justify-between ${className}`)}>
        {imageUrl && (
          <span className="absolute left-1/2 top-1/2 z-[1] flex h-full w-full -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            {setImageUrl && (
              <ImageDelIcon
                onClick={() => {
                  setSelectedFile('');
                  setImageUrl('');
                }}
                className="cursor-pointer transition-all hover:scale-125"
              />
            )}
          </span>
        )}

        {/* Avatar + camera badge are a single trigger — clicking either opens the
            avatar-colour popover, which also holds the device-upload action. */}
        <Popover
          className="self-center"
          placement="bottom"
          title="Avatar Color"
          trigger={
            <button
              type="button"
              aria-label="Change avatar"
              className="relative flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  width="100"
                  height="100"
                  className={clsx("h-full w-full object-cover", isRounded ? "rounded-full" : "rounded-lg", imgStyle && imgStyle)}
                />
              ) : avatarColor?.backgroundColor ? (
                // TODO: visual size may differ slightly — verify against design (text-3xl was 30px, text-display-s is 40px)
                <div
                  className="h-[120px] w-[120px] rounded-full uppercase flex items-center justify-center text-display-s font-semibold"
                  style={avatarColor}
                >
                  {avatarName}
                </div>
              ) : (
                <span className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-muted">
                  <UserFallbackIcon className="h-12 w-12 text-icon-muted" aria-hidden />
                </span>
              )}

              {/* Camera badge — decorative, the wrapping button owns the click */}
              {setImageUrl && (
                <span
                  aria-hidden="true"
                  // Fixed D5: was bg-[#0f2044]/hover:bg-[#1a3366] — both map to brand-focus per D5 color audit decision
                  className={clsx("absolute flex h-6 w-6 items-center justify-center rounded-full bg-brand-focus text-white shadow-md transition-colors z-10", imageUrl ? "right-3 bottom-6" : "right-0 bottom-3")}
                >
                  <UploadIcon />
                </span>
              )}
            </button>
          }
          footer={({ close }) => (
            <Button
              variant="text"
              label="Upload from device"
              onClick={() => {
                close();
                triggerFileInput();
              }}
            />
          )}
        >
          <div className="flex w-full flex-wrap items-center gap-1">
            {DEFAULT_AVATAR_COLORS.map((style, id) => (
              <button
                type="button"
                key={id}
                className={clsx(
                  "h-10 w-10 rounded-full font-semi-bold text-label-s uppercase",
                  selectedColor.backgroundColor === style.backgroundColor && "border-brand border-2"
                )}
                style={{ color: style.color, backgroundColor: style.backgroundColor }}
                onClick={() => setSelectedColor(style)}
              >
                {getAvatarInitials({ name: avatarName }) || "JW"}
              </button>
            ))}
          </div>
        </Popover>

        {/* "Profile Picture" label shown when no image */}
        {(hideProfileTitle && !title) ? (
          <p className="mt-4 text-center text-body-s text-text-tertiary font-medium capitalize">{imageAlt}</p>
        ) :
          <p className="mt-4 text-center text-body-s text-text-tertiary font-medium capitalize">{title}</p>}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={!setImageUrl}
        />
      </div>

      {/* Crop modal */}
      {pendingImageSrc && (
        <CropModal
          isOpen={cropOpen}
          imageSrc={pendingImageSrc}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
};

export { ImageUploaderWithCropFeature };