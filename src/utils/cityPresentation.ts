export function cityNameOnly(value: string): string {
  return value.split(',')[0].trim();
}

export function cityLabel(
  value: string,
  alternatives: string[] = []
): string {
  const parts = value.split(',').map(part => part.trim());

  if (parts.length < 3) return value;

  const name = parts[0];
  const country = parts[parts.length - 1];

  const duplicate = alternatives.some(other => {
    if (other === value) return false;

    const fields = other.split(',').map(part => part.trim());

    return (
      fields[0] === name &&
      fields[fields.length - 1] === country
    );
  });

  return duplicate ? value : `${name}, ${country}`;
}