export type PendingCommentState = {
  pendingId: string;
  from: number;
  to: number;
  quote: string;
};

export type EditorCommentComposeDetail = PendingCommentState;

export const EDITOR_COMMENT_COMPOSE_EVENT = "editor:comment-compose";

export function dispatchEditorCommentCompose(detail: EditorCommentComposeDetail): void {
  document.dispatchEvent(
    new CustomEvent<EditorCommentComposeDetail>(EDITOR_COMMENT_COMPOSE_EVENT, {
      detail,
      bubbles: true,
    }),
  );
}
