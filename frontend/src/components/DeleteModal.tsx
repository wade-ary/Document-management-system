import { File } from "@/app/types";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
  useDisclosure,
} from "@nextui-org/react";
import React from "react";
import { FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { API_ENDPOINTS } from "@/config/api";

interface DeleteModalProps {
    file: File;
}

function DeleteModal({file}: DeleteModalProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const API_DELETE_REQUEST = API_ENDPOINTS.DELETE_REQUEST;

  const handleDeleteRequest = async (file_id: string, user_id: string) => {
    toast.promise(
      fetch(API_DELETE_REQUEST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "delete", file_id: file_id, user_id: user_id }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          console.log("Delete request successful", data);
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);
          throw error;
        }),
      {
        pending: "Submitting delete request...",
        success: `Deletion requested for ${file.fileName}`,
        error: {
          render({ data }: { data: Error }) {
            return data.message || "Failed to submit delete request";
          },
        },
      }
    );
    console.log("Delete Requested");
  };

  return (
    <div>
      <div
        onClick={onOpen}
        className="cursor-pointer grid place-items-center w-7 h-7 p-1 flex-none rounded-lg bg-red-500 hover:bg-red-600"
      >
        <Tooltip content="Delete this file">
          <FaTrash color="white" size={12} />
        </Tooltip>
      </div>
      <Modal
        closeButton
        backdrop="blur"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className="max-w-[40vw] max-h-[30vh]"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <h2 className="text-xl font-bold">Delete</h2>
              </ModalHeader>
              <ModalBody>
                <div className="w-full h-full p-4">
                  Do you want to request the deletion of this File/Folder?
                </div>
              </ModalBody>
              <ModalFooter className="flex justify-end gap-2">
                <Button
                  color="default"
                  onClick={onClose}
                  className="bg-gray-300 text-gray-700 hover:bg-gray-400 transition duration-150"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleDeleteRequest(file.fileId, file.userId);
                    onClose();
                }}
                  color="danger"
                  className="transition duration-150"
                >
                  Request Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

export default DeleteModal;

