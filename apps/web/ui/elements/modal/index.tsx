'use client';

import { Dialog, Transition } from '@headlessui/react';
import React, { Fragment } from 'react';

interface ModalProps {
  isOpen: boolean;
  closeModal: () => void;
  children?: React.ReactNode;
}

const Modal = ({ isOpen, closeModal, children }: ModalProps) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-modal" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 z-overlay bg-overlay/25" />
        </Transition.Child>

        <div className="fixed inset-0 z-modal overflow-y-auto">
          <div className="flex min-h-full items-end text-center md:p-4 md:items-center md:justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="md:w-fit w-full md:align-middle shadow-lg transition-all">
                {/* Content taller than the screen scrolls inside the sheet.
                    Without the cap a long form (Add Supplier) pushed its own
                    footer past the bottom of the viewport on a phone. */}
                <div className="max-h-[90dvh] overflow-y-auto overscroll-contain rounded-tl-2xl rounded-tr-2xl bg-card md:max-h-[85vh] md:rounded-2xl">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export { Modal };
