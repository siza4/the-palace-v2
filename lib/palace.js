export function generateRoyalId() {

  const year = new Date().getFullYear();

  const number = Math.floor(
    100000 + Math.random() * 900000
  );

  return `PLC-${year}-${number}`;

}
