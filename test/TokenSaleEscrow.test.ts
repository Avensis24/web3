import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

const ONE_MUSDT = 1_000_000n;
const ONE_TSALE = ethers.parseEther("1");
const RATE = 1n;
const MAX_PER_WALLET = ethers.parseEther("1000");
const INITIAL_INV = ethers.parseEther("500000");

async function deployAll() {
  const [owner, buyer, nonOwner, poorBuyer] = await ethers.getSigners();

  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy(owner.address);
  await mockUSDT.waitForDeployment();

  const TSaleToken = await ethers.getContractFactory("TSaleToken");
  const tsaleToken = await TSaleToken.deploy(owner.address);
  await tsaleToken.waitForDeployment();

  const TokenSaleEscrow = await ethers.getContractFactory("TokenSaleEscrow");
  const escrow = await TokenSaleEscrow.deploy(
    await mockUSDT.getAddress(),
    await tsaleToken.getAddress(),
    RATE,
    MAX_PER_WALLET
  );
  await escrow.waitForDeployment();

  await tsaleToken.transfer(await escrow.getAddress(), INITIAL_INV);
  await mockUSDT.mint(buyer.address, 10_000n * ONE_MUSDT);

  return { mockUSDT, tsaleToken, escrow, owner, buyer, nonOwner, poorBuyer };
}

function musdt(tsaleWholeTokens: bigint): bigint {
  return tsaleWholeTokens * ONE_MUSDT;
}

describe("TokenSaleEscrow", function () {
  describe("Successful purchase", function () {
    it("transfers TSALE to buyer and mUSDT to escrow", async function () {
      const { mockUSDT, tsaleToken, escrow, buyer } = await deployAll();
      const buyAmount = ethers.parseEther("10");
      const cost = musdt(10n);

      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), cost);

      const buyerBefore = await tsaleToken.balanceOf(buyer.address);
      const escrowBefore = await mockUSDT.balanceOf(await escrow.getAddress());

      await escrow.connect(buyer).buyTokens(buyAmount);

      expect(await tsaleToken.balanceOf(buyer.address)).to.equal(buyerBefore + buyAmount);
      expect(await mockUSDT.balanceOf(await escrow.getAddress())).to.equal(escrowBefore + cost);
    });
  });

  describe("Purchase without token approval", function () {
    it("reverts when buyer has not approved the escrow", async function () {
      const { escrow, buyer } = await deployAll();
      await expect(escrow.connect(buyer).buyTokens(ethers.parseEther("10"))).to.revert(ethers);
    });
  });

  describe("Purchase with insufficient allowance", function () {
    it("reverts when allowance < required cost", async function () {
      const { mockUSDT, escrow, buyer } = await deployAll();
      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), musdt(5n));
      await expect(escrow.connect(buyer).buyTokens(ethers.parseEther("10"))).to.revert(ethers);
    });
  });

  describe("Purchase with insufficient payment-token balance", function () {
    it("reverts when buyer has no mUSDT", async function () {
      const { mockUSDT, escrow, poorBuyer } = await deployAll();
      await mockUSDT.connect(poorBuyer).approve(await escrow.getAddress(), musdt(1000n));
      await expect(escrow.connect(poorBuyer).buyTokens(ethers.parseEther("10"))).to.revert(ethers);
    });
  });

  describe("Purchase while contract is paused", function () {
    it("reverts buyTokens when paused", async function () {
      const { mockUSDT, escrow, owner, buyer } = await deployAll();
      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), musdt(10n));
      await escrow.connect(owner).pause();
      await expect(escrow.connect(buyer).buyTokens(ethers.parseEther("10"))).to.be.revertedWithCustomError(escrow, "EnforcedPause");
    });

    it("succeeds after unpausing", async function () {
      const { mockUSDT, escrow, owner, buyer } = await deployAll();
      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), musdt(10n));
      await escrow.connect(owner).pause();
      await escrow.connect(owner).unpause();
      await escrow.connect(buyer).buyTokens(ethers.parseEther("10"));
    });
  });

  describe("Purchase within wallet limit", function () {
    it("allows purchase that does not exceed maxPerWallet", async function () {
      const { mockUSDT, escrow, buyer } = await deployAll();
      const buyAmount = ethers.parseEther("500");
      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), musdt(500n));
      await escrow.connect(buyer).buyTokens(buyAmount);
    });
  });

  describe("Purchase exceeding wallet limit", function () {
    it("reverts when a single purchase exceeds maxPerWallet", async function () {
      const { mockUSDT, escrow, buyer } = await deployAll();
      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), musdt(1001n));
      await expect(escrow.connect(buyer).buyTokens(ethers.parseEther("1001"))).to.be.revertedWith("Escrow: exceeds wallet purchase limit");
    });
  });

  describe("Cumulative purchase tracking", function () {
    it("tracks two partial buys and rejects a third that exceeds the limit", async function () {
      const { mockUSDT, escrow, buyer } = await deployAll();
      const first = ethers.parseEther("600");
      const second = ethers.parseEther("400");
      const third = ethers.parseEther("1");

      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), musdt(1001n));

      await escrow.connect(buyer).buyTokens(first);
      expect(await escrow.purchased(buyer.address)).to.equal(first);

      await escrow.connect(buyer).buyTokens(second);
      expect(await escrow.purchased(buyer.address)).to.equal(first + second);

      await expect(escrow.connect(buyer).buyTokens(third)).to.be.revertedWith("Escrow: exceeds wallet purchase limit");
    });
  });

  describe("Owner can update maxPerWallet", function () {
    it("raises the limit and allows a previously-rejected purchase", async function () {
      const { mockUSDT, escrow, owner, buyer } = await deployAll();
      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), musdt(2000n));
      await escrow.connect(buyer).buyTokens(MAX_PER_WALLET);

      await expect(escrow.connect(buyer).buyTokens(ONE_TSALE)).to.be.revertedWith("Escrow: exceeds wallet purchase limit");

      const newMax = ethers.parseEther("2000");
      await escrow.connect(owner).setMaxPerWallet(newMax);
      expect(await escrow.maxPerWallet()).to.equal(newMax);

      await escrow.connect(buyer).buyTokens(ONE_TSALE);
    });
  });

  describe("Non-owner cannot update maxPerWallet", function () {
    it("reverts setMaxPerWallet when called by non-owner", async function () {
      const { escrow, nonOwner } = await deployAll();
      await expect(escrow.connect(nonOwner).setMaxPerWallet(ethers.parseEther("5000"))).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  describe("Non-owner cannot pause or unpause", function () {
    it("reverts pause() when called by non-owner", async function () {
      const { escrow, nonOwner } = await deployAll();
      await expect(escrow.connect(nonOwner).pause()).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("reverts unpause() when called by non-owner", async function () {
      const { escrow, owner, nonOwner } = await deployAll();
      await escrow.connect(owner).pause();
      await expect(escrow.connect(nonOwner).unpause()).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  describe("Non-owner withdrawal must fail", function () {
    it("reverts withdrawPayments when called by non-owner", async function () {
      const { escrow, nonOwner } = await deployAll();
      await expect(escrow.connect(nonOwner).withdrawPayments(nonOwner.address)).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("reverts withdrawUnsoldTokens when called by non-owner", async function () {
      const { escrow, nonOwner } = await deployAll();
      await expect(escrow.connect(nonOwner).withdrawUnsoldTokens(nonOwner.address)).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  describe("Owner payment withdrawal", function () {
    it("transfers all collected mUSDT to the owner", async function () {
      const { mockUSDT, escrow, owner, buyer } = await deployAll();
      const cost = musdt(100n);
      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), cost);
      await escrow.connect(buyer).buyTokens(ethers.parseEther("100"));

      const ownerBefore = await mockUSDT.balanceOf(owner.address);
      await escrow.connect(owner).withdrawPayments(owner.address);

      expect(await mockUSDT.balanceOf(owner.address)).to.equal(ownerBefore + cost);
      expect(await mockUSDT.balanceOf(await escrow.getAddress())).to.equal(0n);
    });
  });

  describe("Owner unsold-token withdrawal", function () {
    it("transfers all unsold TSALE to the owner", async function () {
      const { tsaleToken, escrow, owner } = await deployAll();
      const inventory = await escrow.inventoryBalance();
      const ownerBefore = await tsaleToken.balanceOf(owner.address);

      await escrow.connect(owner).withdrawUnsoldTokens(owner.address);

      expect(await tsaleToken.balanceOf(owner.address)).to.equal(ownerBefore + inventory);
      expect(await escrow.inventoryBalance()).to.equal(0n);
    });
  });

  describe("Correct balances after purchase", function () {
    it("reflects accurate mUSDT and TSALE changes for buyer and escrow", async function () {
      const { mockUSDT, tsaleToken, escrow, buyer } = await deployAll();
      const buyAmount = ethers.parseEther("250");
      const cost = musdt(250n);

      const b_mBefore = await mockUSDT.balanceOf(buyer.address);
      const b_tBefore = await tsaleToken.balanceOf(buyer.address);
      const e_mBefore = await mockUSDT.balanceOf(await escrow.getAddress());
      const e_tBefore = await tsaleToken.balanceOf(await escrow.getAddress());

      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), cost);
      await escrow.connect(buyer).buyTokens(buyAmount);

      expect(await mockUSDT.balanceOf(buyer.address)).to.equal(b_mBefore - cost);
      expect(await tsaleToken.balanceOf(buyer.address)).to.equal(b_tBefore + buyAmount);
      expect(await mockUSDT.balanceOf(await escrow.getAddress())).to.equal(e_mBefore + cost);
      expect(await tsaleToken.balanceOf(await escrow.getAddress())).to.equal(e_tBefore - buyAmount);
    });
  });

  describe("Purchase fails when inventory is insufficient", function () {
    it("reverts when escrow holds fewer tokens than requested", async function () {
      const { mockUSDT, escrow, owner, buyer } = await deployAll();
      await escrow.connect(owner).withdrawUnsoldTokens(owner.address);
      expect(await escrow.inventoryBalance()).to.equal(0n);

      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), musdt(10n));
      await expect(escrow.connect(buyer).buyTokens(ethers.parseEther("10"))).to.be.revertedWith("Escrow: insufficient token inventory");
    });
  });

  describe("Events are emitted correctly", function () {
    it("emits TokensPurchased with correct args", async function () {
      const { mockUSDT, escrow, buyer } = await deployAll();
      const buyAmount = ethers.parseEther("50");
      const cost = musdt(50n);
      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), cost);

      await expect(escrow.connect(buyer).buyTokens(buyAmount))
        .to.emit(escrow, "TokensPurchased")
        .withArgs(buyer.address, buyAmount, cost);
    });

    it("emits PaymentWithdrawn with correct args", async function () {
      const { mockUSDT, escrow, owner, buyer } = await deployAll();
      const cost = musdt(50n);
      await mockUSDT.connect(buyer).approve(await escrow.getAddress(), cost);
      await escrow.connect(buyer).buyTokens(ethers.parseEther("50"));

      await expect(escrow.connect(owner).withdrawPayments(owner.address))
        .to.emit(escrow, "PaymentWithdrawn")
        .withArgs(owner.address, cost);
    });

    it("emits UnsoldTokensWithdrawn with correct args", async function () {
      const { escrow, owner } = await deployAll();
      const inventory = await escrow.inventoryBalance();
      await expect(escrow.connect(owner).withdrawUnsoldTokens(owner.address))
        .to.emit(escrow, "UnsoldTokensWithdrawn")
        .withArgs(owner.address, inventory);
    });

    it("emits RateUpdated when setRate is called", async function () {
      const { escrow, owner } = await deployAll();
      await expect(escrow.connect(owner).setRate(2n))
        .to.emit(escrow, "RateUpdated")
        .withArgs(RATE, 2n);
    });

    it("emits MaxPerWalletUpdated when setMaxPerWallet is called", async function () {
      const { escrow, owner } = await deployAll();
      const newMax = ethers.parseEther("2000");
      await expect(escrow.connect(owner).setMaxPerWallet(newMax))
        .to.emit(escrow, "MaxPerWalletUpdated")
        .withArgs(MAX_PER_WALLET, newMax);
    });
  });

  describe("Input validation", function () {
    it("reverts buyTokens with zero amount", async function () {
      const { escrow, buyer } = await deployAll();
      await expect(escrow.connect(buyer).buyTokens(0n)).to.be.revertedWith("Escrow: amount must be positive");
    });

    it("reverts withdrawPayments to zero address", async function () {
      const { escrow, owner } = await deployAll();
      await expect(escrow.connect(owner).withdrawPayments(ethers.ZeroAddress)).to.be.revertedWith("Escrow: zero recipient address");
    });

    it("reverts setRate with zero value", async function () {
      const { escrow, owner } = await deployAll();
      await expect(escrow.connect(owner).setRate(0n)).to.be.revertedWith("Escrow: rate must be positive");
    });
  });
});
