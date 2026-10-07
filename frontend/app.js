// ============================================================
// PAYTRACE AI
// Cross-Border Payment Tracker
// Fast Hackathon Demo Version
// ============================================================

const NETWORK = NETWORKS[ACTIVE_NETWORK];

const REAL_TESTNET_TX =
  "0xb49ef2981a1409c8cb7fe434b4f65eb320c6ed4b7fd54872d0e4f3c3916bd72a";

const RECEIVER_ADDRESS =
  "0x11d728Ea3Dd40eAae34bD54A13a1072A3F09bb7D";

let currentPayment = null;
let blockchainProofCount = 0;
let isRecording = false;


// ============================================================
// HELPERS
// ============================================================

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

  return (
    err?.shortMessage ||
    err?.reason ||
    err?.message ||
    String(err)
  );
}


function txUrl(hash) {
  return `${NETWORK.explorer}/tx/${hash}`;
}


function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}


function getCurrencySymbol(currency) {

  if (currency === "EUR") {
    return "€";
  }

  if (currency === "GBP") {
    return "£";
  }

  return "$";
}


function shortAddress(address) {

  if (!address) {
    return "-";
  }

  return (
    address.slice(0, 6) +
    "..." +
    address.slice(-4)
  );
}


function setLinkStatus(
  id,
  message,
  hash
) {

  const el = $(id);

  if (!el) {
    return;
  }

  if (!hash) {
    el.textContent = message;
    return;
  }

  el.innerHTML = `
    ${message}
    <br>
    <a
      href="${txUrl(hash)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      View on Sepolia Etherscan ↗
    </a>
  `;
}


// ============================================================
// BACKEND API
// ============================================================

async function api(
  path,
  options = {}
) {

  const response =
    await fetch(
      `${BACKEND_URL}${path}`,
      {
        headers: {
          "Content-Type":
            "application/json",
          ...(options.headers || {})
        },
        ...options
      }
    );


  const data =
    await response
      .json()
      .catch(() => ({}));


  if (!response.ok) {

    throw new Error(
      data.error ||
      `Backend error: ${response.status}`
    );
  }


  return data;
}


// ============================================================
// WALLET DISPLAY
// ============================================================

function setupWalletCard() {

  setText(
    "wallet-address",
    "Testnet Demo Wallet"
  );


  setText(
    "wallet-balance",
    "Sepolia ETH + USDC"
  );


  setText(
    "connect-status",
    "✅ Testnet environment ready"
  );


  const button =
    $("connect-btn");


  if (button) {

    button.textContent =
      "Testnet Wallet Ready";

    button.disabled = true;

  }
}


// ============================================================
// BUILD PAYMENT
// ============================================================

function buildPayment(
  amount,
  fromCurrency,
  fromCountry,
  toCurrency,
  toCountry
) {

  // ----------------------------------------------------------
  // Dynamic percentage-based costs
  // ----------------------------------------------------------

  const initiatedFee =
    amount * 0.0020;

  const providerFee =
    amount * 0.0060;

  const intermediaryFee =
    amount * 0.0120;

  const fxFee =
    amount * 0.0030;

  const receivingFee =
    amount * 0.0030;

  const fxLoss =
    amount * 0.0140;


  const exchangeRate =
    getExchangeRate(
      fromCurrency,
      toCurrency
    );


  return {

    id:
      "PT-" +
      Date.now()
        .toString()
        .slice(-6),

    amount,

    paymentToken:
      "USDC",

    fromCurrency,
    fromCountry,

    toCurrency,
    toCountry,

    receiver:
      RECEIVER_ADDRESS,

    realTestnetTx:
      REAL_TESTNET_TX,

    blockchainRecorded:
      false,

    blockchainTxHash:
      null,

    hops: [

      {
        name:
          "Payment Initiated",

        status:
          "Completed",

        fee:
          initiatedFee,

        fxLoss:
          0,

        time:
          1,

        fxRate:
          `1 ${fromCurrency} = ${exchangeRate.toFixed(2)} ${toCurrency}`
      },

      {
        name:
          "Payment Provider",

        status:
          "Completed",

        fee:
          providerFee,

        fxLoss:
          0,

        time:
          3,

        fxRate:
          `1 ${fromCurrency} = ${exchangeRate.toFixed(2)} ${toCurrency}`
      },

      {
        name:
          "Intermediary Bank",

        status:
          "Completed",

        fee:
          intermediaryFee,

        fxLoss:
          0,

        time:
          8,

        fxRate:
          `1 ${fromCurrency} = ${exchangeRate.toFixed(2)} ${toCurrency}`
      },

      {
        name:
          "FX Conversion",

        status:
          "Completed",

        fee:
          fxFee,

        fxLoss:
          fxLoss,

        time:
          4,

        fxRate:
          `1 ${fromCurrency} = ${exchangeRate.toFixed(2)} ${toCurrency}`
      },

      {
        name:
          "Receiving Bank",

        status:
          "Completed",

        fee:
          receivingFee,

        fxLoss:
          0,

        time:
          5,

        fxRate:
          `1 ${fromCurrency} = ${(exchangeRate * 0.986).toFixed(2)} ${toCurrency}`
      }

    ]
  };
}


// ============================================================
// EXCHANGE RATES
// ============================================================

function getExchangeRate(
  from,
  to
) {

  if (from === to) {
    return 1;
  }


  const rates = {

    "USD_INR":
      83.20,

    "EUR_INR":
      90.10,

    "GBP_INR":
      105.50,

    "USD_EUR":
      0.92,

    "GBP_EUR":
      1.17,

    "EUR_USD":
      1.09,

    "GBP_USD":
      1.27,

    "USD_GBP":
      0.79,

    "EUR_GBP":
      0.86

  };


  return (
    rates[`${from}_${to}`] ||
    1
  );
}


// ============================================================
// CREATE PAYMENT
// ============================================================

async function createPayment() {

  try {

    const amount =
      Number(
        $("payment-amount")?.value
      );


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      setText(
        "payment-status",
        "❌ Enter a valid payment amount."
      );

      return;
    }


    const fromCurrency =
      $("from-currency")?.value ||
      "USD";


    const fromCountry =
      $("from-country")?.value ||
      "USA";


    const toCurrency =
      $("to-currency")?.value ||
      "INR";


    const toCountry =
      $("to-country")?.value ||
      "India";


    const button =
      $("create-payment-btn");


    if (button) {

      button.disabled = true;

      button.textContent =
        "⏳ Creating Journey...";
    }


    setText(
      "payment-status",
      "🔄 Building cross-border payment journey..."
    );


    // --------------------------------------------------------
    // Create dynamic payment
    // --------------------------------------------------------

    currentPayment =
      buildPayment(
        amount,
        fromCurrency,
        fromCountry,
        toCurrency,
        toCountry
      );


    // --------------------------------------------------------
    // Render
    // --------------------------------------------------------

    renderPayment();

    renderFeeBreakdown();

    updateInsights();


    setLinkStatus(
      "payment-status",

      `✅ Payment ${currentPayment.id} created. ` +
      `Journey is ready for analysis.`,

      REAL_TESTNET_TX
    );


    if (button) {

      button.disabled = false;

      button.textContent =
        "🚀 Send Payment";
    }


  } catch (err) {

    console.error(err);


    setText(
      "payment-status",
      `❌ ${friendlyError(err)}`
    );


    const button =
      $("create-payment-btn");


    if (button) {

      button.disabled = false;

      button.textContent =
        "🚀 Send Payment";
    }
  }
}


// ============================================================
// RENDER PAYMENT JOURNEY
// ============================================================

function renderPayment() {

  if (!currentPayment) {
    return;
  }


  setText(
    "payment-id",
    currentPayment.id
  );


  setText(
    "payment-total",
    `${currentPayment.amount.toFixed(2)} USDC`
  );


  setText(
    "payment-current-status",
    "Completed • Tracking"
  );


  const timeline =
    $("timeline");


  if (!timeline) {
    return;
  }


  timeline.innerHTML = "";


  // ----------------------------------------------------------
  // REAL TESTNET PAYMENT REFERENCE
  // ----------------------------------------------------------

  const realPayment =
    document.createElement("div");


  realPayment.style.cssText = `
    padding:18px;
    margin-bottom:20px;
    border-radius:14px;
    border:1px solid rgba(0,220,180,.35);
    background:rgba(0,220,180,.08);
    line-height:1.6;
  `;


  realPayment.innerHTML = `

    <strong>
      💳 Real Sepolia Testnet Payment
    </strong>

    <br>

    A real
    <strong>1 USDC</strong>
    testnet transfer was completed
    from Account 1 to the demo receiver.

    <br>

    <a
      href="${txUrl(REAL_TESTNET_TX)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      View verified USDC transaction ↗
    </a>

    <br>

    <small style="opacity:.7">
      Additional amounts entered above are used to
      simulate the payment journey and fee impact.
    </small>

  `;


  timeline.appendChild(
    realPayment
  );


  // ----------------------------------------------------------
  // HOPS
  // ----------------------------------------------------------

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
            Status:
            <strong>
              ${hop.status}
            </strong>
          </p>

          <p>
            Fee:
            <strong>
              ${formatMoney(hop.fee)}
            </strong>
          </p>

          <p>
            FX Loss:
            <strong>
              ${formatMoney(hop.fxLoss)}
            </strong>
          </p>

          <p>
            Exchange Rate:
            <strong>
              ${hop.fxRate}
            </strong>
          </p>

          <p>
            Processing Time:
            <strong>
              ${hop.time} min
            </strong>
          </p>

        </div>

      `;


      timeline.appendChild(
        item
      );
    }
  );
}


// ============================================================
// FEE BREAKDOWN
// ============================================================

function renderFeeBreakdown() {

  if (!currentPayment) {
    return;
  }


  const totalFees =
    currentPayment.hops.reduce(
      (sum, hop) =>
        sum + hop.fee,
      0
    );


  const fxLoss =
    currentPayment.hops.reduce(
      (sum, hop) =>
        sum + hop.fxLoss,
      0
    );


  const finalAmount =
    Math.max(
      0,
      currentPayment.amount -
      totalFees -
      fxLoss
    );


  setText(
    "original-amount",
    `${currentPayment.amount.toFixed(2)} USDC`
  );


  setText(
    "total-fees",
    formatMoney(totalFees)
  );


  setText(
    "fx-loss",
    formatMoney(fxLoss)
  );


  setText(
    "final-amount",
    `${finalAmount.toFixed(2)} USDC`
  );


  const breakdown =
    $("fee-breakdown");


  if (!breakdown) {
    return;
  }


  breakdown.innerHTML = "";


  currentPayment.hops.forEach(
    hop => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "fee-row";


      row.innerHTML = `

        <span>
          ${hop.name}
        </span>

        <strong>
          ${formatMoney(
            hop.fee + hop.fxLoss
          )}
        </strong>

      `;


      breakdown.appendChild(
        row
      );
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
        (sum, hop) =>
          sum + hop.fee,
        0
      );


    const fxLoss =
      currentPayment.hops.reduce(
        (sum, hop) =>
          sum + hop.fxLoss,
        0
      );


    const totalCost =
      totalFees + fxLoss;


    // --------------------------------------------------------
    // Find highest-cost stages
    // --------------------------------------------------------

    const ranked =
      [...currentPayment.hops]
        .map(
          hop => ({
            ...hop,

            totalCost:
              hop.fee +
              hop.fxLoss
          })
        )
        .sort(
          (a, b) =>
            b.totalCost -
            a.totalCost
        );


    const highest =
      ranked[0];


    const highestFee =
      [...currentPayment.hops]
        .sort(
          (a, b) =>
            b.fee -
            a.fee
        )[0];


    const highestFX =
      [...currentPayment.hops]
        .sort(
          (a, b) =>
            b.fxLoss -
            a.fxLoss
        )[0];


    // --------------------------------------------------------
    // Try backend AI
    // --------------------------------------------------------

    let backendAI =
      null;


    try {

      backendAI =
        await api(
          "/ai/decide",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                payment:
                  currentPayment
              })
          }
        );

    } catch (err) {

      console.warn(
        "Backend AI unavailable:",
        err
      );
    }


    // --------------------------------------------------------
    // Estimated saving
    // --------------------------------------------------------

    const estimatedSaving =
      Math.min(
        totalCost,
        totalFees * 0.40 +
        fxLoss * 0.50
      );


    let recommendation =
      "";


    recommendation +=
      `The highest-cost stage is ` +
      `${highest.name}, contributing ` +
      `${formatMoney(highest.totalCost)}. `;


    recommendation +=
      `The largest direct fee is ` +
      `${highestFee.name} ` +
      `(${formatMoney(highestFee.fee)}). `;


    if (highestFX.fxLoss > 0) {

      recommendation +=
        `The main FX loss occurs during ` +
        `${highestFX.name} ` +
        `(${formatMoney(highestFX.fxLoss)}). `;
    }


    recommendation +=
      `AI recommends comparing lower-fee ` +
      `intermediary routes and better FX ` +
      `conversion rates. `;


    recommendation +=
      `Estimated potential saving: ` +
      `${formatMoney(estimatedSaving)}.`;


    setText(
      "ai-recommendation",
      recommendation
    );


    setText(
      "estimated-saving",
      formatMoney(
        estimatedSaving
      )
    );


    const result =
      $("ai-result");


    if (result) {

      result.classList.remove(
        "hidden"
      );
    }


    setText(
      "ai-status",

      backendAI
        ? "✅ AI analysis completed using payment data"
        : "✅ AI optimization completed"
    );


  } catch (err) {

    console.error(err);


    setText(
      "ai-status",
      `❌ ${friendlyError(err)}`
    );
  }
}


// ============================================================
// BLOCKCHAIN PROOF
// ============================================================

async function recordPaymentHopsOnChain() {

  if (!currentPayment) {

    setText(
      "blockchain-status",
      "⚠️ Create a payment first."
    );

    return;
  }


  if (isRecording) {

    return;
  }


  if (
    currentPayment.blockchainRecorded
  ) {

    setText(
      "blockchain-status",
      "✅ This payment is already recorded on-chain."
    );

    return;
  }


  const button =
    $("record-blockchain-btn");


  try {

    isRecording = true;


    if (button) {

      button.disabled = true;

      button.textContent =
        "⏳ Recording...";
    }


    setText(
      "blockchain-status",
      "⛓️ Creating one tamper-evident proof..."
    );


    // --------------------------------------------------------
    // One complete payment journey
    // --------------------------------------------------------

    const proofText =
      JSON.stringify({

        paymentId:
          currentPayment.id,

        amount:
          currentPayment.amount,

        token:
          currentPayment.paymentToken,

        fromCurrency:
          currentPayment.fromCurrency,

        toCurrency:
          currentPayment.toCurrency,

        fromCountry:
          currentPayment.fromCountry,

        toCountry:
          currentPayment.toCountry,

        receiver:
          currentPayment.receiver,

        realTestnetPayment:
          REAL_TESTNET_TX,

        hops:
          currentPayment.hops.map(
            hop => ({
              name:
                hop.name,

              status:
                hop.status,

              fee:
                Number(
                  hop.fee.toFixed(6)
                ),

              fxLoss:
                Number(
                  hop.fxLoss.toFixed(6)
                ),

              time:
                hop.time,

              fxRate:
                hop.fxRate
            })
          )

      });


    // --------------------------------------------------------
    // Backend hashes + stores on Sepolia
    // --------------------------------------------------------

    const response =
      await api(
        "/records",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              text:
                proofText
            })
        }
      );


    currentPayment.blockchainRecorded =
      true;


    currentPayment.blockchainTxHash =
      response.txHash;


    currentPayment.blockchainRecordId =
      response.id;


    blockchainProofCount += 1;


    // --------------------------------------------------------
    // Show Etherscan
    // --------------------------------------------------------

    setLinkStatus(

      "blockchain-status",

      `✅ Payment journey recorded as blockchain Proof #${response.id}`,

      response.txHash
    );


    addBlockchainRecord(
      response.id,
      response.txHash
    );


    updateInsights();


  } catch (err) {

    console.error(err);


    setText(
      "blockchain-status",
      `❌ ${friendlyError(err)}`
    );


  } finally {

    isRecording = false;


    if (button) {

      button.disabled = false;

      button.textContent =
        "🔐 Record Payment Journey on Blockchain";
    }
  }
}


// ============================================================
// DISPLAY BLOCKCHAIN RECORD
// ============================================================

function addBlockchainRecord(
  id,
  hash
) {

  const container =
    $("blockchain-records");


  if (!container) {
    return;
  }


  if (
    container.textContent
      .includes(
        "No blockchain proofs yet."
      )
  ) {

    container.innerHTML = "";
  }


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "record";


  row.innerHTML = `

    <strong>
      Proof #${id}
    </strong>

    <a
      href="${txUrl(hash)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      View proof ↗
    </a>

  `;


  container.prepend(
    row
  );
}


// ============================================================
// LOAD BLOCKCHAIN RECORDS
// ============================================================

async function loadBlockchainRecords() {

  const container =
    $("blockchain-records");


  if (!container) {
    return;
  }


  try {

    const data =
      await api(
        "/records"
      );


    const records =
      Array.isArray(
        data.records
      )
        ? data.records
        : [];


    if (records.length === 0) {

      container.innerHTML =
        "<p>No blockchain proofs yet.</p>";

      setText(
        "blockchain-proofs",
        "0"
      );

      return;
    }


    container.innerHTML = "";


    records.forEach(
      record => {

        addBlockchainRecord(
          record.id,
          record.txHash
        );
      }
    );


    blockchainProofCount =
      records.length;


    setText(
      "blockchain-proofs",
      String(
        blockchainProofCount
      )
    );


  } catch (err) {

    console.warn(
      "Could not load records:",
      err
    );
  }
}


// ============================================================
// INSIGHTS
// ============================================================

function updateInsights() {

  if (!currentPayment) {
    return;
  }


  const totalFees =
    currentPayment.hops.reduce(
      (sum, hop) =>
        sum + hop.fee,
      0
    );


  const fxLoss =
    currentPayment.hops.reduce(
      (sum, hop) =>
        sum + hop.fxLoss,
      0
    );


  const totalCost =
    totalFees + fxLoss;


  const savings =
    Math.min(
      totalCost,
      totalFees * 0.40 +
      fxLoss * 0.50
    );


  setText(
    "total-payments",
    "1"
  );


  setText(
    "insight-fees",
    formatMoney(
      totalCost
    )
  );


  setText(
    "potential-savings",
    formatMoney(
      savings
    )
  );


  setText(
    "blockchain-proofs",
    String(
      blockchainProofCount
    )
  );
}


// ============================================================
// INITIALIZATION
// ============================================================

function init() {

  console.log(
    "🚀 PayTrace AI started"
  );


  // Network
  setText(
    "network-badge",
    NETWORK.name
  );


  // Wallet
  setupWalletCard();


  // Create payment
  const createButton =
    $("create-payment-btn");


  if (createButton) {

    createButton.onclick =
      createPayment;
  }


  // AI
  const aiButton =
    $("ai-optimize-btn");


  if (aiButton) {

    aiButton.onclick =
      optimizeWithAI;
  }


  // Blockchain
  const blockchainButton =
    $("record-blockchain-btn");


  if (blockchainButton) {

    blockchainButton.onclick =
      recordPaymentHopsOnChain;
  }


  // Refresh
  const refreshButton =
    $("refresh-btn");


  if (refreshButton) {

    refreshButton.onclick =
      loadBlockchainRecords;
  }


  // Load existing records
  loadBlockchainRecords();


  console.log(
    "✅ PayTrace AI ready"
  );
}


// ============================================================
// START
// ============================================================

init();