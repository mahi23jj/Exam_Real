import type { CourseWorkspaceData, KnowledgePin, PublicQuestion } from '../types/workspace';

const authors = {
  mahlet: { id: '1', name: 'Mahlet', initials: 'MH' },
  alex: { id: '2', name: 'Alex', initials: 'AL' },
  dawit: { id: '3', name: 'Dawit', initials: 'DW' },
  sara: { id: '4', name: 'Sara', initials: 'SR' },
};

const memoryManagementPins: KnowledgePin[] = [
  {
    id: 'pin-1',
    type: 'memory_trick',
    content: 'Think of paging as a library catalog — the page table is the index card that tells you which shelf (frame) holds each book (page).',
    author: authors.mahlet,
    likes: 24,
    replies: [
      {
        id: 'r1',
        author: authors.dawit,
        content: 'This helped me remember TLB vs page table!',
        likes: 5,
        createdAt: '2d ago',
      },
    ],
    anchorText: 'page table maps virtual pages to physical frames',
    documentId: 'note-memory-management',
    pageIndex: 0,
  },
  {
    id: 'pin-2',
    type: 'exam_hint',
    content: 'Exit exams love asking about page fault handling order: check TLB → page table → disk.',
    author: authors.sara,
    likes: 18,
    replies: [],
    anchorText: 'page fault occurs when a page is not in memory',
    documentId: 'note-memory-management',
    pageIndex: 0,
  },
  {
    id: 'pin-3',
    type: 'warning',
    content: 'Do not confuse internal fragmentation (fixed partitions) with external fragmentation (variable partitions).',
    author: authors.alex,
    likes: 12,
    replies: [],
    anchorText: 'external fragmentation',
    documentId: 'note-chapter-1',
    pageIndex: 1,
  },
];

const memoryManagementQuestions: PublicQuestion[] = [
  {
    id: 'pq-1',
    anchorText: 'virtual memory',
    content: 'Why does virtual memory use demand paging instead of loading everything at once?',
    author: authors.alex,
    likes: 8,
    replies: [
      {
        id: 'pq-r1',
        author: authors.mahlet,
        content: 'Because most programs only use a fraction of their address space at any time. Demand paging saves RAM.',
        likes: 11,
        createdAt: '1d ago',
        replies: [
          {
            id: 'pq-r1-1',
            author: authors.dawit,
            content: 'Also reduces startup time significantly.',
            likes: 3,
            createdAt: '12h ago',
          },
        ],
      },
    ],
    documentId: 'note-memory-management',
  },
];

export const operatingSystemsWorkspace: CourseWorkspaceData = {
  id: 'operating-systems',
  name: 'Operating Systems',
  creator: 'Mahlet',
  folders: [
    {
      id: 'folder-notes',
      name: 'Notes',
      defaultOpen: true,
      items: [
        { id: 'item-ch1', name: 'Chapter 1.pdf', documentId: 'note-chapter-1', type: 'note' },
        { id: 'item-ch2', name: 'Chapter 2.pdf', documentId: 'note-chapter-2', type: 'note' },
        { id: 'item-mm', name: 'Memory Management.pdf', documentId: 'note-memory-management', type: 'note' },
      ],
    },
    {
      id: 'folder-exams',
      name: 'Past Exams',
      defaultOpen: true,
      items: [
        { id: 'item-exam-2025', name: 'Exit Exam 2025', documentId: 'exam-2025', type: 'past_exam' },
        { id: 'item-exam-2024', name: 'Exit Exam 2024', documentId: 'exam-2024', type: 'past_exam' },
      ],
    },
    {
      id: 'folder-materials',
      name: 'Materials',
      defaultOpen: false,
      items: [
        { id: 'item-syllabus', name: 'Course Syllabus.pdf', documentId: 'note-chapter-1', type: 'note' },
      ],
    },
  ],
  documents: {
    'note-chapter-1': {
      id: 'note-chapter-1',
      name: 'Chapter 1.pdf',
      type: 'note',
      sections: [
        {
          id: 'ch1-s1',
          heading: 'Introduction to Operating Systems',
          paragraphs: [
            'An operating system (OS) is system software that manages computer hardware, software resources, and provides common services for computer programs. It acts as an intermediary between users and computer hardware.',
            'The primary goals of an operating system include convenience for the user, efficient use of hardware resources, and the ability to evolve the system without disrupting user applications.',
          ],
        },
        {
          id: 'ch1-s2',
          heading: 'Memory Management Fundamentals',
          paragraphs: [
            'Memory management is one of the most critical functions of an operating system. It keeps track of each byte in a computer\'s memory and allocates portions to various running programs.',
            'External fragmentation occurs when free memory is split into small blocks scattered throughout the address space, making it impossible to satisfy large allocation requests even though total free memory is sufficient.',
            'Internal fragmentation happens when memory is allocated in fixed-size blocks and the requested size is smaller than the block, leaving unused space within the allocated region.',
          ],
        },
      ],
      pins: [memoryManagementPins[2]],
      questions: [],
    },
    'note-chapter-2': {
      id: 'note-chapter-2',
      name: 'Chapter 2.pdf',
      type: 'note',
      sections: [
        {
          id: 'ch2-s1',
          heading: 'Process Management',
          paragraphs: [
            'A process is a program in execution. It includes the program counter, stack, data section, and heap. The operating system manages processes through creation, scheduling, and termination.',
            'Context switching is the mechanism by which the CPU switches from running one process to another. It involves saving the state of the old process and loading the state of the new process.',
          ],
        },
        {
          id: 'ch2-s2',
          heading: 'CPU Scheduling',
          paragraphs: [
            'CPU scheduling is the basis of multiprogrammed operating systems. By switching the CPU among processes, the operating system can make the computer more productive.',
            'Scheduling algorithms include First-Come First-Served (FCFS), Shortest Job First (SJF), Priority Scheduling, and Round Robin. Each has different trade-offs between throughput, turnaround time, and response time.',
          ],
        },
      ],
      pins: [],
      questions: [],
    },
    'note-memory-management': {
      id: 'note-memory-management',
      name: 'Memory Management.pdf',
      type: 'note',
      sections: [
        {
          id: 'mm-s1',
          heading: 'Virtual Memory',
          paragraphs: [
            'Virtual memory is a memory management technique that gives an application the impression it has contiguous working memory, while in fact it may be physically fragmented and may even overflow onto disk storage.',
            'Demand paging is a method where pages are only loaded into memory when they are referenced. This reduces memory usage and improves system performance for programs with large address spaces.',
          ],
        },
        {
          id: 'mm-s2',
          heading: 'Paging and Page Tables',
          paragraphs: [
            'In paging, physical memory is divided into fixed-size blocks called frames, and logical memory is divided into blocks of the same size called pages. The page table maps virtual pages to physical frames.',
            'A page fault occurs when a page is not in memory and must be fetched from disk. The OS handles this by finding a free frame, reading the page from disk, updating the page table, and restarting the instruction.',
            'The Translation Lookaside Buffer (TLB) is a hardware cache that stores recent page table translations, dramatically speeding up virtual-to-physical address conversion.',
          ],
        },
      ],
      pins: memoryManagementPins.slice(0, 2),
      questions: memoryManagementQuestions,
    },
    'exam-2025': {
      id: 'exam-2025',
      name: 'Exit Exam 2025',
      type: 'past_exam',
      intro: 'Department of Computer Science — Exit Examination 2025. Operating Systems. Time: 3 hours. Answer all questions.',
      questions: [
        {
          id: 'eq-1',
          number: 1,
          text: 'Which CPU scheduling algorithm can cause starvation for low-priority processes?',
          choices: [
            'Round Robin',
            'First-Come First-Served',
            'Priority Scheduling',
            'Shortest Job First',
          ],
          correctIndex: 2,
          explanation:
            'Priority Scheduling assigns the CPU to the process with the highest priority. If high-priority processes continuously arrive, lower-priority processes may never get scheduled — this is called starvation. Aging is a common solution that gradually increases the priority of waiting processes.',
          confidence: 'high',
          noteReference: {
            documentId: 'note-chapter-2',
            sectionId: 'ch2-s2',
            highlightText: 'Priority Scheduling',
            title: 'Chapter 2.pdf — CPU Scheduling',
          },
          intelligence: {
            topic: 'CPU Scheduling',
            mostAskedCount: 18,
            yearsAppeared: [2021, 2023, 2025],
          },
          pins: [
            {
              id: 'eq-pin-1',
              type: 'memory_trick',
              content: 'Priority = "VIP line" — if VIPs keep arriving, regular customers starve.',
              author: authors.mahlet,
              likes: 15,
              replies: [],
              anchorText: 'Priority Scheduling',
              documentId: 'exam-2025',
            },
          ],
          publicQuestions: [
            {
              id: 'eq-pq-1',
              anchorText: 'starvation',
              content: 'How does aging prevent starvation in priority scheduling?',
              author: authors.dawit,
              likes: 6,
              replies: [
                {
                  id: 'eq-pq-r1',
                  author: authors.mahlet,
                  content: 'Aging increases a process priority the longer it waits, so eventually even low-priority processes get scheduled.',
                  likes: 9,
                  createdAt: '3d ago',
                },
              ],
              documentId: 'exam-2025',
            },
          ],
        },
        {
          id: 'eq-2',
          number: 2,
          text: 'What happens when a page fault occurs in a demand paging system?',
          choices: [
            'The process is terminated immediately',
            'The OS loads the required page from disk into a free frame',
            'The page table is deleted',
            'The TLB is flushed permanently',
          ],
          correctIndex: 1,
          explanation:
            'When a page fault occurs, the operating system finds a free frame (or evicts one), reads the required page from secondary storage into that frame, updates the page table entry, and restarts the faulting instruction.',
          confidence: 'high',
          noteReference: {
            documentId: 'note-memory-management',
            sectionId: 'mm-s2',
            highlightText: 'A page fault occurs when a page is not in memory',
            title: 'Memory Management.pdf — Paging and Page Tables',
          },
          intelligence: {
            topic: 'Memory Management',
            mostAskedCount: 22,
            yearsAppeared: [2020, 2022, 2024, 2025],
          },
          pins: [],
          publicQuestions: [],
        },
        {
          id: 'eq-3',
          number: 3,
          text: 'Which of the following best describes external fragmentation?',
          choices: [
            'Unused space within an allocated memory block',
            'Free memory scattered in non-contiguous blocks',
            'Memory leak in a running process',
            'Corruption of the page table',
          ],
          correctIndex: 1,
          explanation:
            'External fragmentation occurs when free memory exists in small, non-contiguous blocks scattered throughout the address space. Even if total free memory is enough, no single block may be large enough to satisfy an allocation request.',
          confidence: 'medium',
          noteReference: {
            documentId: 'note-chapter-1',
            sectionId: 'ch1-s2',
            highlightText: 'External fragmentation occurs when free memory is split into small blocks',
            title: 'Chapter 1.pdf — Memory Management Fundamentals',
          },
          intelligence: {
            topic: 'Memory Fragmentation',
            mostAskedCount: 14,
            yearsAppeared: [2019, 2021, 2024],
          },
          pins: [],
          publicQuestions: [],
        },
      ],
    },
    'exam-2024': {
      id: 'exam-2024',
      name: 'Exit Exam 2024',
      type: 'past_exam',
      intro: 'Department of Computer Science — Exit Examination 2024. Operating Systems.',
      questions: [
        {
          id: 'eq24-1',
          number: 1,
          text: 'What is the primary purpose of a Translation Lookaside Buffer (TLB)?',
          choices: [
            'Store process control blocks',
            'Cache recent virtual-to-physical address translations',
            'Manage disk I/O scheduling',
            'Handle page faults',
          ],
          correctIndex: 1,
          explanation:
            'The TLB is a hardware cache that stores recent translations from virtual addresses to physical addresses, avoiding repeated page table lookups and significantly improving memory access performance.',
          confidence: 'high',
          noteReference: {
            documentId: 'note-memory-management',
            sectionId: 'mm-s2',
            highlightText: 'Translation Lookaside Buffer (TLB)',
            title: 'Memory Management.pdf',
          },
          intelligence: {
            topic: 'Virtual Memory',
            mostAskedCount: 16,
            yearsAppeared: [2020, 2022, 2024],
          },
          pins: [],
          publicQuestions: [],
        },
      ],
    },
  },
};

export const workspaceRegistry: Record<string, CourseWorkspaceData> = {
  'operating-systems': operatingSystemsWorkspace,
};

export function getWorkspaceData(courseId: string): CourseWorkspaceData | null {
  return workspaceRegistry[courseId] ?? null;
}
