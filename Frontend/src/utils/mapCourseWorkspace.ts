import type { CourseRead } from '../services/courseService';
import type { CourseDocument as ApiDocument } from '../services/documentService';
import type { CourseWorkspaceData, CourseDocument } from '../types/workspace';

function displayName(doc: ApiDocument): string {
  return doc.title || doc.file_name || 'Untitled document';
}

export function mapCourseToWorkspace(
  course: CourseRead,
  apiDocs: ApiDocument[],
): CourseWorkspaceData {
  const notes = apiDocs.filter((doc) => doc.doc_type === 'NOTE');
  const exams = apiDocs.filter((doc) => doc.doc_type === 'PAST_EXAM');

  const documents: Record<string, CourseDocument> = {};

  notes.forEach((doc) => {
    documents[doc.id] = {
      id: doc.id,
      name: displayName(doc),
      type: 'note',
      sections: [],
      pins: [],
      questions: [],
      fileUrl: doc.cloudinary_secure_url,
      fileType: doc.file_type,
      documentVersion: doc.version ?? 1,
    };
  });

  exams.forEach((doc) => {
    documents[doc.id] = {
      id: doc.id,
      name: displayName(doc),
      type: 'past_exam',
      intro: '',
      questions: [],
      fileUrl: doc.cloudinary_secure_url,
      fileType: doc.file_type,
      documentVersion: doc.version ?? 1,
    };
  });

  return {
    id: course.id,
    name: course.title,
    creator: '',
    folders: [
      {
        id: 'folder-notes',
        name: 'Notes',
        defaultOpen: true,
        items: notes.map((doc) => ({
          id: `item-${doc.id}`,
          name: displayName(doc),
          documentId: doc.id,
          type: 'note',
        })),
      },
      {
        id: 'folder-exams',
        name: 'Past Exams',
        defaultOpen: true,
        items: exams.map((doc) => ({
          id: `item-${doc.id}`,
          name: displayName(doc),
          documentId: doc.id,
          type: 'past_exam',
        })),
      },
    ],
    documents,
  };
}
