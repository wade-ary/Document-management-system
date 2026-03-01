import React from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/react";

type ModalProps = {
  searchText: string;
  setSearchText: (searchText: string) => void;
  fileType: string[];
  fileTypeOptions: { label: string; value: string }[];
  setFileType: (fileType: string[]) => void;
  peopleNames: string[];
  setPeopleNames: (peopleNames: string[]) => void;
  customTags: string[];
  setCustomTags: (customTags: string[]) => void;
  onExtensiveSearch: () => void;
};

function ExtensiveSearchModal({
  searchText,
  setSearchText,
  fileType,
  fileTypeOptions,
  setFileType,
  peopleNames,
  setPeopleNames,
  customTags,
  setCustomTags,
  onExtensiveSearch,
}: ModalProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <Button
        className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-semibold h-12 px-8 rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105"
        onClick={() => {
          onOpen();
        }}
        title="Extensive Search"
      >
        <div className="flex items-center gap-2">
          <div className="bg-transparent rounded-lg">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          Extensive Search
        </div>
      </Button>
      <Modal
        closeButton
        backdrop="blur"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className="max-w-4xl w-full"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <svg className="h-6 w-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-800 bg-clip-text text-transparent">
                    Extensive Search
                  </h2>
                </div>
              </ModalHeader>
              <ModalBody className="bg-slate-50 p-8 overflow-y-auto">
                <div className="flex flex-col gap-6">
                  <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-md">
                    <label
                      htmlFor="searchText"
                      className="flex items-center gap-2 mb-3 font-bold text-lg text-slate-800"
                    >
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                      </div>
                      Text to be searched
                    </label>
                    <Input
                      id="searchText"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Enter text to search"
                      className="border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition-all duration-200 bg-slate-50 hover:border-slate-300"
                      classNames={{
                        input: "text-slate-800 font-medium",
                        inputWrapper: "border-2 border-slate-200 rounded-xl hover:border-slate-300 focus-within:border-violet-400"
                      }}
                    />
                  </div>

                  <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-md">
                    <label
                      htmlFor="fileType"
                      className="flex items-center gap-2 mb-3 font-bold text-lg text-slate-800"
                    >
                      <div className="p-1.5 bg-emerald-100 rounded-lg">
                        <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      Types of files to be searched
                    </label>
                    <select
                      id="fileType"
                      multiple
                      value={fileType}
                      onChange={(e) =>
                        setFileType(
                          Array.from(e.target.selectedOptions, (option) => option.value)
                        )
                      }
                      className="border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 w-full bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium text-slate-800"
                    >
                      {fileTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-md">
                    <label
                      htmlFor="peopleNames"
                      className="flex items-center gap-2 mb-3 font-bold text-lg text-slate-800"
                    >
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      People in the images (if any)
                    </label>
                    <input
                      id="peopleNames"
                      type="text"
                      value={peopleNames.join(", ")}
                      onChange={(e) => setPeopleNames(e.target.value.split(", "))}
                      placeholder="Enter names separated by commas"
                      className="border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 w-full bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium text-slate-800"
                    />
                  </div>

                  <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-md">
                    <label
                      htmlFor="customTags"
                      className="flex items-center gap-2 mb-3 font-bold text-lg text-slate-800"
                    >
                      <div className="p-1.5 bg-amber-100 rounded-lg">
                        <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      Custom tags
                    </label>
                    <input
                      id="customTags"
                      type="text"
                      value={customTags.join(", ")}
                      onChange={(e) => setCustomTags(e.target.value.split(", "))}
                      placeholder="Enter tags separated by commas"
                      className="border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 w-full bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium text-slate-800"
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className="bg-gradient-to-r from-slate-50 to-purple-50/30 border-t border-slate-200 p-6 gap-3">
                <Button
                  className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    onExtensiveSearch();
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </div>
                </Button>
                <Button
                  className="bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
                  onClick={onClose}
                >
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export default ExtensiveSearchModal;
