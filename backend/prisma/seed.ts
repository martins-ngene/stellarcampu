import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial StellarCampus challenges...');

  const challenges = [
    {
      id: 'wallet_verify_001',
      title: 'Wallet Ownership Verification',
      description: 'Connect your Stellar wallet (Freighter, xBull) and sign a dynamic challenge to verify account ownership.',
      category: 'Wallet & Account',
      difficulty: 'Beginner',
      network: 'testnet',
      expectedOpType: 'SIGNATURE_CHALLENGE',
      orderIndex: 1,
      isActive: true,
      config: {
        type: 'auth_nonce',
        instructions: 'Sign the random challenge nonce with your private key via the wallet popup.'
      }
    },
    {
      id: 'fund_account_002',
      title: 'Fund a Stellar Testnet Account',
      description: 'Request Testnet XLM from the Stellar Friendbot to activate your developer account.',
      category: 'Wallet & Account',
      difficulty: 'Beginner',
      network: 'testnet',
      expectedOpType: 'FRIENDBOT_FUNDING',
      orderIndex: 2,
      isActive: true,
      config: {
        type: 'balance_check',
        minimumBalanceXlm: 1.0,
        instructions: 'Use Friendbot at https://friendbot.stellar.org?addr={publicKey} or the in-app funding button.'
      }
    },
    {
      id: 'payment_xlm_003',
      title: 'Execute an XLM Payment',
      description: 'Send a payment of 2.0 XLM to the StellarCampus Testnet vault including your unique challenge memo.',
      category: 'Stellar Payments',
      difficulty: 'Intermediate',
      network: 'testnet',
      expectedOpType: 'PAYMENT',
      orderIndex: 3,
      isActive: true,
      config: {
        type: 'payment',
        asset: 'native',
        amount: '2.0000000',
        requireMemo: true,
        instructions: 'Submit a native payment of 2 XLM to the assigned destination with your assigned unique memo.'
      }
    },
    {
      id: 'asset_transfer_004',
      title: 'Transfer a Supported Stellar Asset',
      description: 'Establish a trustline for the testnet CAMPUS asset and transfer 10.0 CAMPUS tokens with your assigned memo.',
      category: 'Stellar Assets',
      difficulty: 'Intermediate',
      network: 'testnet',
      expectedOpType: 'PAYMENT',
      orderIndex: 4,
      isActive: true,
      config: {
        type: 'custom_asset_payment',
        assetCode: 'CAMPUS',
        assetIssuer: process.env.CAMPUS_ASSET_ISSUER || 'GAII65YQHVIE4Q2OYG73CRIQZPDN4DJNHN4W6WRUVSJBXEVWPVZ4QKAV',
        amount: '10.0000000',
        requireMemo: true,
        instructions: 'Add a trustline for CAMPUS and execute a payment of 10 CAMPUS tokens to the assigned destination.'
      }
    },
    {
      id: 'soroban_contract_005',
      title: 'Interact with a Soroban Smart Contract',
      description: 'Invoke the complete_challenge function on the deployed StellarCampus Soroban contract with your wallet authorization.',
      category: 'Soroban Smart Contracts',
      difficulty: 'Advanced',
      network: 'testnet',
      expectedOpType: 'INVOKE_HOST_FUNCTION',
      orderIndex: 5,
      isActive: true,
      config: {
        type: 'soroban_invocation',
        function: 'complete_challenge',
        challengeId: 5,
        instructions: 'Call complete_challenge(student, 5, nonce) on the deployed StellarCampus challenge contract.'
      }
    }
  ];

  for (const challenge of challenges) {
    await prisma.challenge.upsert({
      where: { id: challenge.id },
      update: challenge,
      create: challenge
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
