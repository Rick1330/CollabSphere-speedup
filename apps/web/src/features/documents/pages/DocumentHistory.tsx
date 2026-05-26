import { Navigate, useParams } from "react-router-dom";
import { resolveDocumentParam, resolveWorkspaceParam } from "@/lib/route-params";

/** Legacy route — opens in-editor version history overlay on the document editor. */
const DocumentHistoryPage = () => {
  const params = useParams();
  const workspaceId = resolveWorkspaceParam(params.workspaceId);
  const documentId = resolveDocumentParam(params.documentId);

  return (
    <Navigate
      to={`/w/${workspaceId}/documents/${documentId}?history=1`}
      replace
    />
  );
};

export default DocumentHistoryPage;
