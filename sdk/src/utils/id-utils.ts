export function toFileKey(id: string): string {
  return id.replace(/\W/g, '-')
}
