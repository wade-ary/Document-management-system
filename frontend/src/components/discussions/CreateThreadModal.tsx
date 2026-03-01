'use client';

import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Chip,
} from '@nextui-org/react';

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, initialComment: string, tags: string[]) => void;
  documentName: string;
}

export default function CreateThreadModal({
  isOpen,
  onClose,
  onCreate,
  documentName,
}: CreateThreadModalProps) {
  const [title, setTitle] = useState('');
  const [initialComment, setInitialComment] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    onCreate(title.trim(), initialComment.trim(), tags);
    
    // Reset form
    setTitle('');
    setInitialComment('');
    setTags([]);
    setTagInput('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3 className="text-xl font-bold">Start New Discussion</h3>
          <p className="text-sm text-slate-600 font-normal">
            About: {documentName}
          </p>
        </ModalHeader>
        <ModalBody>
          <Input
            label="Discussion Title"
            placeholder="What would you like to discuss?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            isRequired
            size="lg"
          />

          <Textarea
            label="Initial Comment (Optional)"
            placeholder="Add context or details about your discussion..."
            value={initialComment}
            onChange={(e) => setInitialComment(e.target.value)}
            minRows={4}
            maxRows={8}
          />

          <div>
            <Input
              label="Tags (Optional)"
              placeholder="Type a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              description="Press Enter to add tags"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    onClose={() => handleRemoveTag(tag)}
                    variant="flat"
                    color="primary"
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isDisabled={!title.trim()}
          >
            Create Discussion
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
