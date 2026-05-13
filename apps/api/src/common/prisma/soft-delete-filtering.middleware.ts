export const softDeleteFilteringMiddleware: any = async (params: any, next: any) => {
  if (params.action === "delete") {
    params.action = "update";
    params.args["data"] = { deletedAt: new Date() };
  }
  if (params.action === "deleteMany") {
    params.action = "updateMany";
    if (params.args["data"]) {
      params.args["data"] = { ...params.args["data"], deletedAt: new Date() };
    } else {
      params.args["data"] = { deletedAt: new Date() };
    }
  }

  // Filter out deleted records by default for read operations
  if (
    [
      "findUnique",
      "findFirst",
      "findMany",
      "count",
      "aggregate",
      "groupBy",
      "findUniqueOrThrow",
      "findFirstOrThrow",
    ].includes(params.action)
  ) {
    if (!params.args) params.args = {};
    if (!params.args.where) params.args.where = {};

    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
  }

  return next(params);
};
