// @ts-ignore
import dayjs from 'dayjs'

export const spiltAddress = (str: string | undefined) => {
  if (!str) return 'null'
  return str.replace(/^(.{6}).*(.{3})$/, '$1...$2')
}

export function dateTimeFormat(timestamp: Date | number, format: string = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(timestamp).format(format)
}
