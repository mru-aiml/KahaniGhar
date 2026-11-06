"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGE_LABELS } from "@/types/story";

interface TranscriptReviewProps {
  transcript: string;
  language: string;
  isMock: boolean;
  onConfirm: (transcript: string) => void;
  onRetry: () => void;
  onEdit: (transcript: string) => void;
}

export default function TranscriptReview({
  transcript,
  language,
  isMock,
  onConfirm,
  onRetry,
  onEdit,
}: TranscriptReviewProps) {
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const [isEditing, setIsEditing] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedTranscript(transcript);
    setHasEdited(false);
  }, [transcript]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onEdit(editedTranscript);
    setIsEditing(false);
    setHasEdited(true);
  };

  const handleCancel = () => {
    setEditedTranscript(transcript);
    setIsEditing(false);
    setHasEdited(false);
  };

  const handleConfirm = () => {
    onConfirm(editedTranscript);
  };

  const handleRetry = () => {
    onRetry();
  };

  const wordCount = editedTranscript.trim().split(/\s+/).filter(Boolean).length;
  const charCount = editedTranscript.length;

  return (
    <div className="rounded-2xl border border-white/10 bg-kg-cream/5 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-heading text-lg text-kg-cream">Review transcript</h3>
          <p className="text-sm text-kg-cream/60">
            Language: <span className="font-medium">{LANGUAGE_LABELS[language as keyof typeof LANGUAGE_LABELS] || language}</span>
          </p>
        </div>
        {isMock && (
          <span className="px-2 py-1 text-xs rounded-full bg-kg-amber/20 text-kg-amber">
            Demo transcript
          </span>
        )}
      </div>

      {isMock && (
        <div className="mb-4 p-3 rounded-lg bg-kg-amber/10 border border-kg-amber/20 text-sm text-kg-amber">
          <strong>Demo mode: </strong>This transcript was generated for demonstration purposes.
          In the full app, this would come from Gnani Prisma STT.
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="transcript" className="block text-sm text-kg-cream/80 mb-2">
          Transcript {isEditing ? "(editing)" : ""}
          <span className="text-xs text-kg-cream/50 ml-2">
            {wordCount} words · {charCount} characters
          </span>
        </label>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            id="transcript"
            value={editedTranscript}
            onChange={(e) => setEditedTranscript(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-kg-amber/30 bg-kg-night/60 px-4 py-3 text-kg-cream outline-none focus:border-kg-amber focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
            placeholder="Transcript will appear here..."
            autoFocus
          />
        ) : (
          <div
            className="w-full rounded-xl border border-white/10 bg-kg-night/60 px-4 py-3 text-kg-cream min-h-[100px]"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {editedTranscript || <span className="text-kg-cream/30">(empty transcript)</span>}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-kg-cream/40">
            {editedTranscript.trim().split(/\s+/).filter(Boolean).length} words · {editedTranscript.length} characters
          </span>
          {isEditing && (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm rounded-lg border border-white/20 text-kg-cream hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm rounded-lg bg-kg-amber text-kg-night font-medium focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
        <button
          onClick={handleRetry}
          className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-white/20 text-kg-cream hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night transition-colors"
        >
          <svg className="inline h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry transcription
        </button>

        {!isEditing && (
          <button
            onClick={handleEdit}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-kg-teal/30 text-kg-teal hover:bg-kg-teal/10 focus:outline-none focus:ring-2 focus:ring-kg-teal focus:ring-offset-2 focus:ring-offset-kg-night transition-colors"
          >
            <svg className="inline h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        )}

        <button
          onClick={handleConfirm}
          disabled={!editedTranscript.trim()}
          className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-kg-amber text-kg-night font-medium focus:outline-none focus:ring-2 focus:ring-kg-amber focus:ring-offset-2 focus:ring-offset-kg-night disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="inline h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Confirm & generate
        </button>
      </div>
    </div>
  );
}