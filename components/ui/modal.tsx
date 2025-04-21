import React from "react";
import { Button } from "./button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-opacity-50 ">
      <div className="p-6 rounded-lg shadow-lg w-96">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-lg"
          >
            ✖
          </Button>
        </div>

        {/* Modal Content */}
        <div className="mt-4">{children}</div>

        {/* Modal Footer */}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={onClose}
            className="px-4 py-2 bg-red-500 text-white rounded-md"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
