import { storage } from '../server/storage';

const battleData = [
  { battleId: 'c12253c4-4096-45aa-8b42-d54c99905a6f', userId: 'd946e3b7-5693-4633-b40a-bb12796d73d9' },
  { battleId: '33b80a38-6613-46e6-9081-f5a57578df35', userId: 'd946e3b7-5693-4633-b40a-bb12796d73d9' },
  { battleId: 'f4e1438c-71e5-4c56-9777-0c69a890d1c8', userId: '47636030' },
];

async function recalculateBattles() {
  console.log('Recalculating battle results...');
  
  for (const { battleId, userId } of battleData) {
    try {
      console.log(`Processing battle ${battleId}...`);
      const result = await storage.calculateBattleResults(battleId, userId, true);
      console.log(`✓ Battle ${battleId} recalculated:`, result.results);
    } catch (error) {
      console.error(`✗ Error recalculating battle ${battleId}:`, error);
    }
  }
  
  console.log('Done!');
  process.exit(0);
}

recalculateBattles();
