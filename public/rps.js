// Rock-paper-scissors duels between players: 0 rock, 1 paper, 2 scissors.
export const RPS = ['PIERRE', 'FEUILLE', 'CISEAUX'];
export const RPS_ICON = ['✊', '✋', '✌️'];
// 1 if a wins, -1 if b wins, 0 on a tie (each one beats the one just before it).
export const beats = (a, b) => [0, 1, -1][(a - b + 3) % 3];
