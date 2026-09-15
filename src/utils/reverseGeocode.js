function finiteKoordinat(nilai) {
  const angka = Number(nilai);
  return Number.isFinite(angka) ? angka : null;
}

async function denganTimeout(promiseFactory, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

function susunAlamatNominatim(address = {}) {
  const jalan = [address.road, address.house_number]
    .filter(Boolean)
    .join(" No. ");
  const wilayah = [
    address.neighbourhood || address.suburb,
    address.city_district || address.village,
    address.city || address.town || address.municipality,
    address.state,
  ].filter(Boolean);

  const bagian = [jalan, ...wilayah];
  return bagian.length ? [...new Set(bagian)].join(", ") : null;
}

function susunAlamatBigDataCloud(data = {}) {
  const wilayah = [
    data.locality,
    data.city && data.city !== data.locality ? data.city : null,
    data.principalSubdivision,
  ].filter(Boolean);
  return wilayah.length ? [...new Set(wilayah)].join(", ") : null;
}

async function reverseGeocode(latitude, longitude) {
  const lat = finiteKoordinat(latitude);
  const lon = finiteKoordinat(longitude);
  if (lat == null || lon == null) return null;

  const hasil = await Promise.allSettled([
    denganTimeout(async (signal) => {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`,
        {
          signal,
          headers: {
            Accept: "application/json",
            "User-Agent": "PT-Zaman-Teknindo-Absensi/1.0",
          },
        },
      );
      if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
      const data = await response.json();
      return susunAlamatNominatim(data.address);
    }, 2800),
    denganTimeout(async (signal) => {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=id`,
        { signal, headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error(`BigDataCloud HTTP ${response.status}`);
      return susunAlamatBigDataCloud(await response.json());
    }, 2800),
  ]);

  for (const item of hasil) {
    if (item.status === "fulfilled" && item.value) return item.value;
  }

  return null;
}

module.exports = { reverseGeocode };
