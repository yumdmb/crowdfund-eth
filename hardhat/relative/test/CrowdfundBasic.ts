import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Crowdfund", function () {
  let crowdfund: any;
  let owner: any;
  let beneficiary: any;
  let contributor1: any;
  let contributor2: any;
  let contributor3: any;
  
  const GOAL = ethers.parseEther("10"); // 10 ETH goal
  const DURATION_DAYS = 30; // 30 days

  async function deployCrowdfundFixture() {
    const [owner, beneficiary, contributor1, contributor2, contributor3] = await ethers.getSigners();
    
    const crowdfund = await ethers.deployContract("Crowdfund", [GOAL, DURATION_DAYS, beneficiary.address]);
    
    return { crowdfund, owner, beneficiary, contributor1, contributor2, contributor3 };
  }

  beforeEach(async function () {
    const fixture = await deployCrowdfundFixture();
    crowdfund = fixture.crowdfund;
    owner = fixture.owner;
    beneficiary = fixture.beneficiary;
    contributor1 = fixture.contributor1;
    contributor2 = fixture.contributor2;
    contributor3 = fixture.contributor3;
  });

  describe("Deployment", function () {
    it("Should set the correct goal", async function () {
      expect(await crowdfund.goal()).to.equal(GOAL);
    });

    it("Should set the correct beneficiary", async function () {
      expect(await crowdfund.beneficiary()).to.equal(beneficiary.address);
    });

    it("Should initialize with zero total raised", async function () {
      expect(await crowdfund.totalRaised()).to.equal(0);
    });

    it("Should initialize with goal not reached", async function () {
      expect(await crowdfund.goalReached()).to.be.false;
    });

    it("Should initialize with funds not withdrawn", async function () {
      expect(await crowdfund.fundsWithdrawn()).to.be.false;
    });

    it("Should revert with invalid goal (zero)", async function () {
      await expect(
        ethers.deployContract("Crowdfund", [0, DURATION_DAYS, beneficiary.address])
      ).to.be.revertedWithCustomError(crowdfund, "InvalidGoal");
    });

    it("Should revert with invalid duration (zero)", async function () {
      await expect(
        ethers.deployContract("Crowdfund", [GOAL, 0, beneficiary.address])
      ).to.be.revertedWithCustomError(crowdfund, "InvalidDuration");
    });

    it("Should revert with invalid beneficiary (zero address)", async function () {
      await expect(
        ethers.deployContract("Crowdfund", [GOAL, DURATION_DAYS, ethers.ZeroAddress])
      ).to.be.revertedWithCustomError(crowdfund, "InvalidBeneficiary");
    });
  });

  describe("Contributions", function () {
    it("Should accept contributions", async function () {
      const contributionAmount = ethers.parseEther("1");
      
      await expect(crowdfund.connect(contributor1).contribute({ value: contributionAmount }))
        .to.emit(crowdfund, "ContributionMade")
        .withArgs(contributor1.address, contributionAmount, contributionAmount);
      
      expect(await crowdfund.totalRaised()).to.equal(contributionAmount);
      expect(await crowdfund.contributions(contributor1.address)).to.equal(contributionAmount);
    });

    it("Should handle multiple contributions from same address", async function () {
      const firstContribution = ethers.parseEther("1");
      const secondContribution = ethers.parseEther("2");
      const totalExpected = firstContribution + secondContribution;
      
      await crowdfund.connect(contributor1).contribute({ value: firstContribution });
      await crowdfund.connect(contributor1).contribute({ value: secondContribution });
      
      expect(await crowdfund.contributions(contributor1.address)).to.equal(totalExpected);
      expect(await crowdfund.totalRaised()).to.equal(totalExpected);
    });

    it("Should handle contributions from multiple addresses", async function () {
      const contribution1 = ethers.parseEther("1");
      const contribution2 = ethers.parseEther("2");
      const contribution3 = ethers.parseEther("3");
      const totalExpected = contribution1 + contribution2 + contribution3;
      
      await crowdfund.connect(contributor1).contribute({ value: contribution1 });
      await crowdfund.connect(contributor2).contribute({ value: contribution2 });
      await crowdfund.connect(contributor3).contribute({ value: contribution3 });
      
      expect(await crowdfund.totalRaised()).to.equal(totalExpected);
      expect(await crowdfund.contributions(contributor1.address)).to.equal(contribution1);
      expect(await crowdfund.contributions(contributor2.address)).to.equal(contribution2);
      expect(await crowdfund.contributions(contributor3.address)).to.equal(contribution3);
    });

    it("Should reach goal and emit GoalReached event", async function () {
      await expect(crowdfund.connect(contributor1).contribute({ value: GOAL }))
        .to.emit(crowdfund, "GoalReached");
      
      expect(await crowdfund.goalReached()).to.be.true;
      expect(await crowdfund.totalRaised()).to.equal(GOAL);
    });

    it("Should allow contributions exceeding goal", async function () {
      const excessAmount = ethers.parseEther("15"); // 5 ETH over goal
      
      await expect(crowdfund.connect(contributor1).contribute({ value: excessAmount }))
        .to.emit(crowdfund, "GoalReached");
      
      expect(await crowdfund.goalReached()).to.be.true;
      expect(await crowdfund.totalRaised()).to.equal(excessAmount);
    });

    it("Should revert with zero contribution", async function () {
      await expect(
        crowdfund.connect(contributor1).contribute({ value: 0 })
      ).to.be.revertedWithCustomError(crowdfund, "InsufficientContribution");
    });

    it("Should revert when goal already reached and trying to contribute more", async function () {
      // First reach the goal
      await crowdfund.connect(contributor1).contribute({ value: GOAL });
      
      // Try to contribute more after goal reached
      await expect(
        crowdfund.connect(contributor2).contribute({ value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(crowdfund, "GoalAlreadyReached");
    });

    it("Should accept contributions via receive function", async function () {
      const contributionAmount = ethers.parseEther("1");
      
      await expect(
        contributor1.sendTransaction({
          to: await crowdfund.getAddress(),
          value: contributionAmount
        })
      ).to.emit(crowdfund, "ContributionMade");
      
      expect(await crowdfund.totalRaised()).to.equal(contributionAmount);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await crowdfund.connect(contributor1).contribute({ value: ethers.parseEther("3") });
    });

    it("Should return correct funding progress", async function () {
      // 3 ETH out of 10 ETH = 30.00%
      const expectedProgress = 3000; // 30.00% * 100
      expect(await crowdfund.getFundingProgress()).to.equal(expectedProgress);
    });

    it("Should return complete campaign info", async function () {
      const [
        _goal,
        _deadline,
        _beneficiary,
        _totalRaised,
        _goalReached,
        _fundsWithdrawn,
        _timeRemaining
      ] = await crowdfund.getCampaignInfo();
      
      expect(_goal).to.equal(GOAL);
      expect(_beneficiary).to.equal(beneficiary.address);
      expect(_totalRaised).to.equal(ethers.parseEther("3"));
      expect(_goalReached).to.be.false;
      expect(_fundsWithdrawn).to.be.false;
      expect(_timeRemaining).to.be.greaterThan(0);
    });

    it("Should return correct contribution for address", async function () {
      const contribution = await crowdfund.getContribution(contributor1.address);
      expect(contribution).to.equal(ethers.parseEther("3"));
      
      const noContribution = await crowdfund.getContribution(contributor2.address);
      expect(noContribution).to.equal(0);
    });

    it("Should return correct status - Active", async function () {
      expect(await crowdfund.getStatus()).to.equal(0); // Active
    });

    it("Should return correct status - GoalReached", async function () {
      await crowdfund.connect(contributor2).contribute({ value: ethers.parseEther("7") });
      expect(await crowdfund.getStatus()).to.equal(1); // GoalReached
    });
  });

  describe("Edge Cases", function () {
    it("Should handle exact goal contribution", async function () {
      await expect(crowdfund.connect(contributor1).contribute({ value: GOAL }))
        .to.emit(crowdfund, "GoalReached");
      
      expect(await crowdfund.goalReached()).to.be.true;
      expect(await crowdfund.totalRaised()).to.equal(GOAL);
    });

    it("Should handle very small contributions", async function () {
      const smallAmount = 1; // 1 wei
      
      await expect(
        crowdfund.connect(contributor1).contribute({ value: smallAmount })
      ).to.emit(crowdfund, "ContributionMade");
      
      expect(await crowdfund.totalRaised()).to.equal(smallAmount);
    });

    it("Should handle very large contributions", async function () {
      const largeAmount = ethers.parseEther("1000"); // 1000 ETH (more reasonable for test)
      
      await expect(
        crowdfund.connect(contributor1).contribute({ value: largeAmount })
      ).to.emit(crowdfund, "GoalReached");
    });
  });

  describe("Gas Usage", function () {
    it("Should use reasonable gas for contribution", async function () {
      const tx = await crowdfund.connect(contributor1).contribute({ 
        value: ethers.parseEther("1") 
      });
      const receipt = await tx.wait();
      
      // Should use less than 100k gas for a contribution
      expect(receipt.gasUsed).to.be.lessThan(100000);
    });
  });
});
