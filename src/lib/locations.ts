/** Singapore planning areas with approximate centroids, for instant suggestions and "near me". */
export const SG_AREAS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Ang Mo Kio', lat: 1.3691, lng: 103.8454 }, { name: 'Bedok', lat: 1.3236, lng: 103.9273 },
  { name: 'Bishan', lat: 1.3526, lng: 103.8352 }, { name: 'Bukit Batok', lat: 1.3590, lng: 103.7637 },
  { name: 'Bukit Merah', lat: 1.2819, lng: 103.8239 }, { name: 'Bukit Panjang', lat: 1.3774, lng: 103.7719 },
  { name: 'Bukit Timah', lat: 1.3294, lng: 103.8021 }, { name: 'Buona Vista', lat: 1.3072, lng: 103.7900 },
  { name: 'Choa Chu Kang', lat: 1.3840, lng: 103.7470 }, { name: 'City Hall', lat: 1.2931, lng: 103.8520 },
  { name: 'Clementi', lat: 1.3162, lng: 103.7649 }, { name: 'Geylang', lat: 1.3201, lng: 103.8918 },
  { name: 'Hougang', lat: 1.3612, lng: 103.8863 }, { name: 'Jurong East', lat: 1.3329, lng: 103.7436 },
  { name: 'Jurong West', lat: 1.3404, lng: 103.7090 }, { name: 'Kallang', lat: 1.3100, lng: 103.8651 },
  { name: 'Marine Parade', lat: 1.3020, lng: 103.9072 }, { name: 'Orchard', lat: 1.3048, lng: 103.8318 },
  { name: 'Pasir Ris', lat: 1.3721, lng: 103.9474 }, { name: 'Punggol', lat: 1.3984, lng: 103.9072 },
  { name: 'Queenstown', lat: 1.2942, lng: 103.7861 }, { name: 'Sembawang', lat: 1.4491, lng: 103.8185 },
  { name: 'Sengkang', lat: 1.3868, lng: 103.8914 }, { name: 'Serangoon', lat: 1.3554, lng: 103.8679 },
  { name: 'Tampines', lat: 1.3496, lng: 103.9568 }, { name: 'Toa Payoh', lat: 1.3343, lng: 103.8563 },
  { name: 'Woodlands', lat: 1.4382, lng: 103.7890 }, { name: 'Yishun', lat: 1.4304, lng: 103.8354 },
  { name: 'Bugis', lat: 1.3008, lng: 103.8559 }, { name: 'Novena', lat: 1.3204, lng: 103.8438 },
];

export function nearestArea(lat: number, lng: number) {
  let best = SG_AREAS[0];
  let bestD = Infinity;
  for (const a of SG_AREAS) {
    const d = (a.lat - lat) ** 2 + ((a.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) { bestD = d; best = a; }
  }
  // Outside Singapore (> ~40 km from every area): no match.
  return Math.sqrt(bestD) * 111 > 40 ? null : best;
}
