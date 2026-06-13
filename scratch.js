const project = { finalized: false, buybackStart: 0, buybackEnd: 0, active: false };
const isConnected = true;
const wrongChain = false;
const projectLoading = false;
const isError = false;
const buybackAmount = "1";
const isValidBuybackAmount = true;
const hasEnoughAllocationForBuyback = true;
const allocation = { claimed: false, refunded: false };

const buybackActive = project
  ? project.finalized && Date.now()/1000 >= project.buybackStart && Date.now()/1000 <= project.buybackEnd
  : false;

const buybackDisabledReason = !isConnected
  ? 'Connect wallet'
  : wrongChain
    ? 'Switch wallet to Hoodi'
    : projectLoading
      ? 'Loading project...'
      : isError
        ? 'Unable to load project'
        : !project
          ? 'Project unavailable'
          : !buybackActive
            ? 'Buyback window is closed'
            : !isValidBuybackAmount
              ? 'Enter amount'
              : !hasEnoughAllocationForBuyback
                ? 'Insufficient allocation' 
                : allocation.claimed
                  ? 'Allocation already claimed'
                  : allocation.refunded
                    ? 'Allocation already refunded'
                    : ''

console.log("Reason:", buybackDisabledReason);
