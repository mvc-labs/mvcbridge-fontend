export const isNaturalNumber = (n: number | string): boolean => {
  n = n.toString()
  const n1 = Math.abs(Number(n))
  const n2 = parseInt(n, 10)
  return !isNaN(n1) && n2 === n1 && n1.toString() === n
}

export const isBtcAddress = (value: string): boolean => {
  return true
}
