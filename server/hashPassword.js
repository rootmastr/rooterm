import bcrypt from 'bcryptjs';

const password = 'm4sy44ll4h';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('Password:', password);
console.log('Hash:', hash);
