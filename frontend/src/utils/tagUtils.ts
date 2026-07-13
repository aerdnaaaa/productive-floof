export interface Tag {
  id: number;
  name: string;
  parent_id?: number | null;
}

export interface SortedTag {
  tag: Tag;
  depth: number;
}

/**
 * Takes a flat array of tags and returns a flat array of tags sorted hierarchically:
 * Root tags sorted alphabetically, followed by their children sorted alphabetically, etc.
 * Includes a depth field for visual indentation.
 */
export function getSortedTagsWithDepth(tags: Tag[]): SortedTag[] {
  const tagMap = new Map<number, Tag>();
  const childrenMap = new Map<number, Tag[]>();
  const rootTags: Tag[] = [];

  // Map all tags for quick lookup
  tags.forEach((tag) => {
    tagMap.set(tag.id, tag);
  });

  // Organize parent-child links
  tags.forEach((tag) => {
    if (tag.parent_id && tagMap.has(tag.parent_id)) {
      const children = childrenMap.get(tag.parent_id) || [];
      children.push(tag);
      childrenMap.set(tag.parent_id, children);
    } else {
      rootTags.push(tag);
    }
  });

  const result: SortedTag[] = [];

  // Recursive DFS helper
  function traverse(tag: Tag, depth: number) {
    result.push({ tag, depth });
    const children = childrenMap.get(tag.id) || [];
    // Sort children alphabetically
    children.sort((a, b) => a.name.localeCompare(b.name));
    children.forEach((child) => traverse(child, depth + 1));
  }

  // Sort roots alphabetically and traverse
  rootTags.sort((a, b) => a.name.localeCompare(b.name));
  rootTags.forEach((tag) => traverse(tag, 0));

  return result;
}
