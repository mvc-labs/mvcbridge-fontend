export const spiltAddress = (str: string | undefined) => {
  if (!str) return 'null'
  return str.replace(/^(.{6}).*(.{3})$/, '$1...$2')
}
