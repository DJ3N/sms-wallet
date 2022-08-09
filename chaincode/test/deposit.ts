import { expect } from 'chai'
import { ethers, waffle } from 'hardhat'
import {
  prepare,
  deployUpgradeable,
  checkBalance,
  getTxCost
} from './utilities'
const config = require('../config.ts')

const ZERO_ETH = ethers.utils.parseEther('0')
const ONE_ETH = ethers.utils.parseEther('1')

describe('AssetManager', function (this) {
  before(async function (this) {
    await prepare(this, [
      'AssetManager'
    ])
  })

  beforeEach(async function (this) {
    this.snapshotId = await waffle.provider.send('evm_snapshot', [])
    await deployUpgradeable(this, [
      [
        'assetManager',
        this.AssetManager,
        [
          config.test.initialOperatorThreshold,
          config.test.initialOperators,
          config.test.initialUserLimit,
          config.test.initialAuthLimit
        ]
      ]
    ])
  })

  afterEach(async function (this) {
    await waffle.provider.send('evm_revert', [this.snapshotId])
  })

  describe('deposit: check deposit functionality', function () {
    it('AM-deposit-0: Positive deposit test', async function () {
      const provider = waffle.provider

      // check Initial Balance
      await checkBalance(this.alice, '10000')
      let aliceBalance = await this.alice.getBalance()
      const bobBalance = await this.bob.getBalance()
      let assetManagerBalance = await provider.getBalance(
        this.assetManager.address
      )
      const tx = await this.assetManager.connect(this.alice).deposit({
        value: ONE_ETH
      })
      await tx.wait()
      const gasUsed = await getTxCost(tx.hash)
      // Calculate and check new balances
      aliceBalance = aliceBalance.sub(ONE_ETH).sub(gasUsed)
      assetManagerBalance = assetManagerBalance.add(ONE_ETH)
      await expect(await this.alice.getBalance()).to.equal(aliceBalance)
      await expect(await this.bob.getBalance()).to.equal(bobBalance)
      await expect(
        await provider.getBalance(this.assetManager.address)
      ).to.equal(assetManagerBalance)
      // Check events emitted
      await expect(tx)
        .to.emit(this.assetManager, 'DepositSuccessful')
        .withArgs(this.alice.address, ONE_ETH, ONE_ETH)
      // Check Alice's Balance and Auth on AssetManager
      await expect(
        await this.assetManager.userBalances(this.alice.address)
      ).to.equal(ONE_ETH)
      expect(
        await this.assetManager.allowance(this.alice.address, this.bob.address)
      ).to.equal(ZERO_ETH)
    })

    it('AM-deposit-1: Negative deposit test amount greater global user limit', async function () {
      await checkBalance(this.alice, '10000')
      const aliceBalance = await this.alice.getBalance()
      const depositAmount = config.test.initialUserLimit.add(ONE_ETH)
      await expect(
        this.assetManager.connect(this.alice).deposit({
          value: depositAmount
        })
      ).to.be.reverted
      // Check that alice did not lose her funds when the transaction was reverted (note she did pay gas fees)
      const aliceNewBalance = await this.alice.getBalance()
      expect(aliceNewBalance).to.be.gt(aliceBalance.sub(depositAmount))
    })

    it('AM-deposit-2: Negative deposit test amount two deposits greater global user limit', async function () {
      let tx = await this.assetManager.connect(this.alice).deposit({
        value: ONE_ETH
      })
      await tx.wait()
      await expect(
        (tx = this.assetManager.connect(this.alice).deposit({
          value: config.test.initialUserLimit
        }))
      ).to.be.reverted
    })
  })
})
