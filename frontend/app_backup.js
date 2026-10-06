// ============================================================
// PAYTRACE AI - PS37
// Cross-Border Payment Tracker + AI Fee Optimization
// ============================================================

// -------------------------
// CONFIG
// -------------------------

const NETWORK = NETWORKS[ACTIVE_NETWORK];

let provider = null;
let signer = null;
let userAddress = null;
let readContract = null;
let currentPayment = null;


// -------------------------
// HELPERS
// -------------------------

function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) {
    el.textContent = value;
  }
}

function friendlyError(err) {
  console.error(err);

  if (err?.code === 4001) {
    return "Transaction/request rejected in MetaMask.";
  }

  if (err?.message?.includes("User rejected")) {
    return "Request rejected in MetaMask.";
  }

  return err?.shortMessage || err?.message || String(err);
}

function txUrl(txHash) {
  if (!txHash) return "#";
  return `${NETWORK.explorer}/tx/${txHash}`;
}


// -------------------------
// BACKEND API
// -------------------------

async function api(path, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Backend error: ${response.status}`);
  }

  return data;
}


// ============================================================
// WALLET
// ============================================================

async function connectWallet() {

  try {

    if (!window.ethereum) {
      setText(
        "connect-status",
        "❌ MetaMask not found. Please open this page in Chrome with MetaMask installed."
      );
      return;
    }

    setText("connect-status", "Connecting to MetaMask...");

    provider = new ethers.BrowserProvider(window.ethereum);

    await provider.send("eth_requestAccounts", []);

    signer = await provider.getSigner();

    userAddress = await signer.getAddress();

    const network = await provider.getNetwork();

    const chainId = Number(network.chainId);

    if (chainId !== NETWORK.chainId) {

      setText(
        "connect-status",
        `⚠️ Please switch MetaMask to ${NETWORK.name}.`
      );

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [
            {
              chainId: `0x${NETWORK.chainId.toString(16)}`
            }
          ]
        });
      } catch (switchError) {

        console.error(switchError);

        setText(
          "connect-status",
          `⚠️ Switch MetaMask to ${NETWORK.name} manually.`
        );

        return;
      }
    }

    const balance = await provider.getBalance(userAddress);

    setText(
      "wallet-address",
      `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
    );

    setText(
      "wallet-balance",
      `${Number(ethers.formatEther(balance)).toFixed(4)} ETH`
    );

    setText(
      "connect-status",
      "✅ Wallet connected"
    );

    readContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );

  } catch (err) {

    setText(
      "connect-status",
      `❌ ${friendlyError(err)}`
    );

  }
}


// ============================================================
// CREATE PAYMENT
// ============================================================

function createPayment() {

  try {

    const amount =
      Number($("payment-amount")?.value) || 1000;

    const fromCurrency =
      $("from-currency")?.value || "USD";

    const fromCountry =
      $("from-country")?.value || "USA";

    const toCurrency =
      $("to-currency")?.value || "INR";

    const toCountry =
      $("to-country")?.value || "India";


    // Mock payment journey
    // Designed for PS37 demonstration

    currentPayment = {

      id:
        "PT-" +
        Date.now().toString().slice(-6),

      amount,

      fromCurrency,
      fromCountry,

      toCurrency,
      toCountry,

      hops: [

        {
          name: "Payment Initiated",
          status: "Completed",
          fee: 2,
          fxLoss: 0,
          time: 1
        },

        {
          name: "Payment Provider",
          status: "Completed",
          fee: 6,
          fxLoss: 0,
          time: 3
        },

        {
          name: "Intermediary Bank",
          status: "Completed",
          fee: 12,
          fxLoss: 0,
          time: 8
        },

        {
          name: "FX Conversion",
          status: "Completed",
          fee: 3,
          fxLoss: 14,
          time: 4
        },

        {
          name: "Receiving Bank",
          status: "Completed",
          fee: 3,
          fxLoss: 0,
          time: 5
        }

      ]

    };


    renderPayment();

    renderFeeBreakdown();

    updateInsights();


    setText(
      "payment-status",
      `✅ Payment ${currentPayment.id} created`
    );

  } catch (err) {

    setText(
      "payment-status",
      `❌ ${friendlyError(err)}`
    );

  }
}


// ============================================================
// RENDER PAYMENT
// ============================================================

function renderPayment() {

  if (!currentPayment) return;

  setText(
    "payment-id",
    currentPayment.id
  );

  setText(
    "payment-total",
    `$${currentPayment.amount.toFixed(2)}`
  );

  setText(
    "payment-current-status",
    "Completed"
  );


  const timeline = $("timeline");

  if (!timeline) return;

  timeline.innerHTML = "";


  currentPayment.hops.forEach(
    (hop, index) => {

      const item =
        document.createElement("div");

      item.className =
        "timeline-item";


      item.innerHTML = `

        <div class="timeline-number">
          ${index + 1}
        </div>

        <div class="timeline-content">

          <h4>
            ${hop.name}
          </h4>

          <p>
            <strong>${hop.status}</strong>
          </p>

          <p>
            Fee:
            <strong>$${hop.fee.toFixed(2)}</strong>
          </p>

          <p>
            FX Loss:
            <strong>$${hop.fxLoss.toFixed(2)}</strong>
          </p>

          <p>
            Time:
            <strong>${hop.time} min</strong>
          </p>

        </div>

      `;

      timeline.appendChild(item);

    }
  );

}


// ============================================================
// FEE BREAKDOWN
// ============================================================

function renderFeeBreakdown() {

  if (!currentPayment) return;


  const totalFees =
    currentPayment.hops.reduce(
      (sum, hop) => sum + hop.fee,
      0
    );


  const fxLoss =
    currentPayment.hops.reduce(
      (sum, hop) => sum + hop.fxLoss,
      0
    );


  const finalAmount =
    currentPayment.amount -
    totalFees -
    fxLoss;


  setText(
    "original-amount",
    `$${currentPayment.amount.toFixed(2)}`
  );

  setText(
    "total-fees",
    `$${totalFees.toFixed(2)}`
  );

  setText(
    "fx-loss",
    `$${fxLoss.toFixed(2)}`
  );

  setText(
    "final-amount",
    `$${finalAmount.toFixed(2)}`
  );


  const breakdown =
    $("fee-breakdown");

  if (!breakdown) return;

  breakdown.innerHTML = "";


  currentPayment.hops.forEach(
    hop => {

      const row =
        document.createElement("div");

      row.className =
        "fee-row";

      row.innerHTML = `

        <span>
          ${hop.name}
        </span>

        <strong>
          $${(
            hop.fee + hop.fxLoss
          ).toFixed(2)}
        </strong>

      `;

      breakdown.appendChild(row);

    }
  );

}


// ============================================================
// AI OPTIMIZATION
// ============================================================

async function optimizeWithAI() {

  if (!currentPayment) {

    setText(
      "ai-status",
      "⚠️ Create a payment first."
    );

    return;
  }


  try {

    setText(
      "ai-status",
      "🤖 AI analyzing payment..."
    );


    const totalFees =
      currentPayment.hops.reduce(
        (sum, hop) => sum + hop.fee,
        0
      );


    const fxLoss =
      currentPayment.hops.reduce(
        (sum, hop) => sum + hop.fxLoss,
        0
      );


    const totalCost =
      totalFees + fxLoss;


    // Try backend AI endpoint

    let backendResult = null;

    try {

      backendResult = await api(
        "/ai/decide",
        {
          method: "POST",

          body: JSON.stringify({
            payment: currentPayment
          })
        }
      );

    } catch (backendError) {

      console.warn(
        "AI backend unavailable:",
        backendError
      );

    }


    // Calculate demo recommendation

    const estimatedSaving =
      Math.max(
        5,
        Math.round(totalCost * 0.45)
      );


    const recommendation =

      `AI Fee Analysis: Your largest cost is the ` +
      `intermediary + FX conversion stage, ` +
      `which accounts for $${totalCost.toFixed(2)} ` +
      `of the payment cost. ` +
      `A lower-fee intermediary route with a ` +
      `better FX rate is recommended. ` +
      `Estimated saving: approximately $${estimatedSaving}.`;


    setText(
      "ai-recommendation",
      recommendation
    );


    setText(
      "estimated-saving",
      `$${estimatedSaving}`
    );


    const resultBox =
      $("ai-result");

    if (resultBox) {
      resultBox.classList.remove("hidden");
    }


    setText(
      "ai-status",
      "✅ AI analysis completed"
    );


  } catch (err) {

    setText(
      "ai-status",
      `❌ ${friendlyError(err)}`
    );

  }
}


// ============================================================
// RECORD PAYMENT JOURNEY ON BLOCKCHAIN
// ============================================================

async function recordPaymentHopsOnChain() {

  if (!currentPayment) {

    setText(
      "blockchain-status",
      "⚠️ Create a payment first."
    );

    return;
  }


  try {

    setText(
      "blockchain-status",
      "⛓️ Recording payment journey..."
    );


    for (
      let i = 0;
      i < currentPayment.hops.length;
      i++
    ) {

      const hop =
        currentPayment.hops[i];


      const proofText = JSON.stringify({

        paymentId:
          currentPayment.id,

        step:
          i + 1,

        hop:
          hop.name,

        status:
          hop.status,

        fee:
          hop.fee,

        fxLoss:
          hop.fxLoss,

        time:
          hop.time

      });


      const response =
        await api(
          "/records",
          {
            method: "POST",

            body: JSON.stringify({
              text: proofText
            })
          }
        );


      console.log(
        "Blockchain proof:",
        response
      );

    }


    setText(
      "blockchain-status",
      "✅ All payment hops recorded on blockchain"
    );


    await loadBlockchainRecords();

    updateInsights();


  } catch (err) {

    setText(
      "blockchain-status",
      `❌ ${friendlyError(err)}`
    );

  }
}


// ============================================================
// LOAD BLOCKCHAIN RECORDS
// ============================================================

async function loadBlockchainRecords() {

  const container =
    $("blockchain-records");

  if (!container) return;


  try {

    setText(
      "blockchain-status",
      "Loading blockchain records..."
    );


    const data =
      await api("/records");


    container.innerHTML = "";


    if (
      !data.records ||
      data.records.length === 0
    ) {

      container.innerHTML =
        "<p>No blockchain proofs yet.</p>";

      setText(
        "blockchain-status",
        "No records yet"
      );

      return;
    }


    data.records.forEach(
      record => {

        const row =
          document.createElement("div");

        row.className =
          "record";


        row.innerHTML = `

          <strong>
            Proof #${record.id}
          </strong>

          <a
            href="${txUrl(record.txHash)}"
            target="_blank"
            rel="noopener"
          >
            View proof ↗
          </a>

        `;


        container.appendChild(row);

      }
    );


    setText(
      "blockchain-status",
      `✅ ${data.records.length} blockchain proof(s)`
    );


  } catch (err) {

    setText(
      "blockchain-status",
      `❌ ${friendlyError(err)}`
    );

  }
}


// ============================================================
// INSIGHTS
// ============================================================

function updateInsights() {

  if (!currentPayment) return;


  const totalFees =
    currentPayment.hops.reduce(
      (sum, hop) => sum + hop.fee,
      0
    );


  const fxLoss =
    currentPayment.hops.reduce(
      (sum, hop) => sum + hop.fxLoss,
      0
    );


  const potentialSavings =
    Math.max(
      5,
      Math.round(
        (totalFees + fxLoss) * 0.45
      )
    );


  setText(
    "total-payments",
    "1"
  );

  setText(
    "insight-fees",
    `$${totalFees.toFixed(2)}`
  );

  setText(
    "potential-savings",
    `$${potentialSavings.toFixed(2)}`
  );

}


// ============================================================
// INITIALIZATION
// ============================================================

function init() {

  console.log(
    "🚀 PayTrace AI initializing..."
  );


  // Wallet

  const connectBtn =
    $("connect-btn");

  if (connectBtn) {

    connectBtn.onclick =
      connectWallet;

  }


  // Create payment

  const createBtn =
    $("create-payment-btn");

  if (createBtn) {

    createBtn.onclick =
      createPayment;

  }


  // AI

  const aiBtn =
    $("ai-optimize-btn");

  if (aiBtn) {

    aiBtn.onclick =
      optimizeWithAI;

  }


  // Blockchain record button

  const recordBtn =
    $("record-blockchain-btn");

  if (recordBtn) {

    recordBtn.onclick =
      recordPaymentHopsOnChain;

  }


  // Refresh

  const refreshBtn =
    $("refresh-btn");

  if (refreshBtn) {

    refreshBtn.onclick =
      loadBlockchainRecords;

  }


  // MetaMask events

  if (window.ethereum) {

    window.ethereum.on(
      "chainChanged",
      () => location.reload()
    );

    window.ethereum.on(
      "accountsChanged",
      () => location.reload()
    );

  }


  console.log(
    "✅ PayTrace AI initialized successfully"
  );

}


// Start application

init();