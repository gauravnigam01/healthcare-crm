// Resolves an Indian PIN code to a district/state pair using India Post's
// public lookup API (api.postalpincode.in) — no key required, CORS-open.
export async function fetchPincodeLocation(pincode) {
  const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
  const data = await res.json();
  const postOffice = data?.[0]?.PostOffice?.[0];

  if (data?.[0]?.Status !== "Success" || !postOffice) return null;

  return { city: postOffice.District || "", state: postOffice.State || "" };
}
