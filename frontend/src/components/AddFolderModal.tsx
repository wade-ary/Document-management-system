import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from '@nextui-org/react'
import React from 'react'
import { MdCreateNewFolder } from 'react-icons/md'
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '@/config/api';

interface AddFolderProps {
    current_path: string;
    refreshFiles: () => void;
}

const AddFolderModal = ({current_path, refreshFiles}: AddFolderProps) => {
    const [folderName, setFolderName] = React.useState("");
    const { isOpen, onOpen , onOpenChange} = useDisclosure();
    const API_CREATE_DIR = API_ENDPOINTS.CREATE_DIR;

    const onCreateDir = async (current_path: string, folderName: string) => {
        if (!folderName.trim()) {
            toast.error('Folder name cannot be empty');
            return;
        }

        if (folderName.includes('/') || folderName.includes('\\')) {
            toast.error('Folder name cannot contain / or \\');
            return;
        }

        toast.promise(
            fetch(API_CREATE_DIR, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ path: current_path, dir_name: folderName }),
            }).then(async (response) => {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to create folder');
                }
                setFolderName("");
                refreshFiles();
                return response;
            }),
            {
                pending: 'Creating folder...',
                success: `Folder ${folderName}/ created successfully`,
                error: {
                    render({data}: {data: {error?: string}}) {
                        return data?.error || 'Failed to create folder';
                    }
                }
            }
        );
    };

  return (
    <div>
        <Button
            className="mr-4 flex gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onOpen}
            title="Add a Folder"
            style={{ borderRadius: "12px", padding: "12px 16px" }}
        >
            <MdCreateNewFolder color="white" size={16} />
            <p>Add Folder</p>
        </Button>
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop="blur"
            className="max-w-[40vw] max-h-[40vh]"
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader>
                            <h3 className="font-bold text-lg">Add a Folder</h3>
                        </ModalHeader>
                        <ModalBody>
                            <p>New Folder Name:</p>
                            <Input
                                className="w-64 border rounded-xl text-violet-800"
                                placeholder="Enter Folder Name"
                                value={folderName}
                                onChange={(e) => setFolderName(e.target.value)}
                            />
                        </ModalBody>
                        <ModalFooter>
                            <Button color="secondary" onClick={() => {
                                onClose();
                                setFolderName("");
                            }}>
                                Cancel
                            </Button>
                            <Button color="primary" onClick={() => {
                                onClose();
                                onCreateDir(current_path, folderName);
                            }}>
                                Add Folder
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    </div>
  )
}

export default AddFolderModal