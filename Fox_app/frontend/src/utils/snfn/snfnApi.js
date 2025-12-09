import { importQuery } from "../queryUtils";;

export async function fetchSnFnData(apiBase, startDate, endDate) {
  const params = {
    startDate: startDate.toISOString(),
    endDate:   endDate  .toISOString(),
  };
  const raw = await importQuery(apiBase, '/api/v1/snfn/station-errors?', params);
  if (!Array.isArray(raw)) {
    throw new Error('SNFN API did not return an array');
  }
  return raw;
}
