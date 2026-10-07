import type { QuestionReplyRead } from '../../services/socialService';

export interface ReplyNode {
  reply: QuestionReplyRead;
  children: ReplyNode[];
}

/**
 * Builds the reply hierarchy from a flat reply list.
 *
 * Two cases would otherwise silently drop replies from the thread:
 *  - the parent is not in the payload (deleted, or not visible to the viewer)
 *  - the parent chain forms a cycle, so every node finds a "parent" and none
 *    of them is ever reachable from a root
 *
 * Both promote the affected reply to the top level, so nothing disappears.
 */
export function buildReplyTree(replies: QuestionReplyRead[]): ReplyNode[] {
  const nodes = new Map<string, ReplyNode>();
  replies.forEach((reply) => nodes.set(reply.id, { reply, children: [] }));

  // A node is part of a cycle only if walking up the parent chain returns to
  // *that* node. Merely reaching a repeated ancestor is not enough: a legitimate
  // descendant of a cycle would otherwise be detached from its parent.
  const inCycle = new Set<string>();
  for (const [id, node] of nodes) {
    const seen = new Set<string>([id]);
    let cursor: string | null | undefined = node.reply.parent_reply_id;
    while (cursor) {
      if (seen.has(cursor)) {
        if (cursor === id) inCycle.add(id);
        break;
      }
      seen.add(cursor);
      cursor = nodes.get(cursor)?.reply.parent_reply_id;
    }
  }

  const roots: ReplyNode[] = [];
  for (const [id, node] of nodes) {
    const parentId = node.reply.parent_reply_id;
    const parent = parentId && parentId !== id ? nodes.get(parentId) : undefined;

    if (parent && !inCycle.has(id)) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Chronological within each level, matching the API's ordering.
  const sortTree = (list: ReplyNode[]) => {
    list.sort((a, b) => a.reply.created_at.localeCompare(b.reply.created_at));
    list.forEach((node) => sortTree(node.children));
  };
  sortTree(roots);

  return roots;
}