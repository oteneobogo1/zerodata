import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";

type Network = {
  name: string;
  color: string;
};

type Transaction = {
  receipt: string;
  network: string;
  data: string;
  amount: number;
  remainingBalance: number;
  date: string;
};
type UserProfile = {
  fullName: string;
  email: string;
  phone: string;
};
type Bundle = {
  data: string;
  price: number;
};

const networks: Network[] = [
  { name: "MTN", color: "#FFC928" },
  { name: "Airtel", color: "#F04452" },
  { name: "Glo", color: "#28C76F" },
  { name: "9mobile", color: "#39C99A" },
];

const bundles: Bundle[] = [
  { data: "500 MB", price: 100 },
  { data: "1 GB", price: 250 },
  { data: "2 GB", price: 500 },
  { data: "5 GB", price: 1000 },
];

const percentages = [1, 2, 5, 10];
const fixedAmounts = [100, 250, 500, 1000];

const money = (amount: number) =>
  `₦${amount.toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}`;

export default function App() {
  const [balance, setBalance] = useState(25000);
  const [screen, setScreen] = useState("home");
  const [network, setNetwork] = useState<Network>(networks[0]);
  const [bundle, setBundle] = useState<Bundle>(bundles[2]);

  const [budgetMode, setBudgetMode] = useState("percentage");
  const [percentage, setPercentage] = useState(5);
  const [fixedBudget, setFixedBudget] = useState(500);

  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "",
    email: "",
    phone: "",
  });

  const [editProfile, setEditProfile] = useState<UserProfile>({
    fullName: "",
    email: "",
    phone: "",
  });

  const [profileNotice, setProfileNotice] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedBalance = await AsyncStorage.getItem(
          "zerodatatopup_balance",
        );

        const savedTransactions = await AsyncStorage.getItem(
          "zerodatatopup_transactions",
        );
        const savedProfile = await AsyncStorage.getItem(
          "zerodatatopup_profile",
        );

        if (savedProfile !== null) {
          const parsedProfile: unknown = JSON.parse(savedProfile);

          if (
            parsedProfile !== null &&
            typeof parsedProfile === "object" &&
            "fullName" in parsedProfile &&
            "email" in parsedProfile &&
            "phone" in parsedProfile &&
            typeof parsedProfile.fullName === "string" &&
            typeof parsedProfile.email === "string" &&
            typeof parsedProfile.phone === "string"
          ) {
            const loadedProfile = {
              fullName: parsedProfile.fullName,
              email: parsedProfile.email,
              phone: parsedProfile.phone,
            };

            setProfile(loadedProfile);
            setEditProfile(loadedProfile);
          }
        }
        if (savedBalance !== null) {
          const parsedBalance = Number(savedBalance);

          if (Number.isFinite(parsedBalance) && parsedBalance >= 0) {
            setBalance(parsedBalance);
          }
        }

        if (savedTransactions !== null) {
          const parsedTransactions: unknown = JSON.parse(savedTransactions);

          if (
            Array.isArray(parsedTransactions) &&
            parsedTransactions.every(
              (item) =>
                item !== null &&
                typeof item === "object" &&
                typeof item.receipt === "string" &&
                typeof item.network === "string" &&
                typeof item.data === "string" &&
                typeof item.amount === "number" &&
                Number.isFinite(item.amount) &&
                item.amount >= 0 &&
                typeof item.remainingBalance === "number" &&
                Number.isFinite(item.remainingBalance) &&
                item.remainingBalance >= 0 &&
                typeof item.date === "string",
            )
          ) {
            setTransactions(parsedTransactions);
          }
        }
      } catch (error) {
        console.error("Could not load saved app data:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSavedData();
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const saveData = async () => {
      await AsyncStorage.multiSet([
        ["zerodatatopup_balance", String(balance)],
        ["zerodatatopup_transactions", JSON.stringify(transactions)],
        ["zerodatatopup_profile", JSON.stringify(profile)],
      ]);
    };

    saveData().catch((error) => {
      console.error("Could not save app data:", error);
    });
  }, [balance, transactions, profile, isLoaded]);

  const budget = Math.min(
    balance,
    budgetMode === "percentage" ? (balance * percentage) / 100 : fixedBudget,
  );

  const chooseMode = (mode: string) => {
    setBudgetMode(mode);
    setNotice("");
  };

  const reviewPurchase = () => {
    if (balance <= 0) {
      setNotice("Your available balance is too low.");
      return;
    }

    if (bundle.price > budget) {
      setNotice(
        `This bundle exceeds your data budget of ${money(budget)}. Choose a lower-cost bundle or increase your budget.`,
      );
      return;
    }

    if (bundle.price > balance) {
      setNotice("Your balance is insufficient for this bundle.");
      return;
    }

    setNotice("");
    setScreen("review");
  };

  const confirmPurchase = () => {
    if (bundle.price > balance || bundle.price > budget) {
      setNotice("Purchase not allowed. Please review your budget.");
      setScreen("topup");
      return;
    }

    const newBalance = balance - bundle.price;
    const newReceipt = `ZDT-${Date.now().toString().slice(-8)}`;

    const newTransaction: Transaction = {
      receipt: newReceipt,
      network: network.name,
      data: bundle.data,
      amount: bundle.price,
      remainingBalance: newBalance,
      date: new Date().toLocaleString(),
    };

    setBalance(newBalance);
    setReceipt(newReceipt);

    setTransactions((previous) => [newTransaction, ...previous]);

    setNotice("");
    setScreen("success");
  };
  const saveUserProfile = () => {
    if (editProfile.fullName.trim() === "") {
      setProfileNotice("Please enter your full name.");
      return;
    }

    setProfile({
      fullName: editProfile.fullName.trim(),
      email: editProfile.email.trim(),
      phone: editProfile.phone.trim(),
    });

    setProfileNotice("Profile saved successfully.");
    setScreen("profile");
  };
  const startAgain = () => {
    setNotice("");
    setScreen("home");
  };

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>Z</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.brand}>ZeroDataTopUp</Text>
        <Text style={styles.tagline}>Your connection lifeline</Text>
      </View>
      <TouchableOpacity
        style={styles.avatarButton}
        onPress={() => {
          setEditProfile(profile);
          setProfileNotice("");
          setScreen("profile");
        }}
      >
        <Text style={styles.avatarButtonText}>
          {profile.fullName.trim()
            ? profile.fullName
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0].toUpperCase())
                .join("")
            : "U"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const BudgetPanel = () => (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>YOUR DATA SPENDING BUDGET</Text>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            budgetMode === "percentage" && styles.activeMode,
          ]}
          onPress={() => chooseMode("percentage")}
        >
          <Text
            style={[
              styles.modeText,
              budgetMode === "percentage" && styles.activeModeText,
            ]}
          >
            Percentage
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            budgetMode === "fixed" && styles.activeMode,
          ]}
          onPress={() => chooseMode("fixed")}
        >
          <Text
            style={[
              styles.modeText,
              budgetMode === "fixed" && styles.activeModeText,
            ]}
          >
            Fixed amount
          </Text>
        </TouchableOpacity>
      </View>

      {budgetMode === "percentage" ? (
        <>
          <Text style={styles.helperText}>
            What percentage of your balance should be available for data?
          </Text>
          <View style={styles.choiceRow}>
            {percentages.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.choice,
                  percentage === item && styles.selectedChoice,
                ]}
                onPress={() => {
                  setPercentage(item);
                  setNotice("");
                }}
              >
                <Text
                  style={[
                    styles.choiceText,
                    percentage === item && styles.selectedChoiceText,
                  ]}
                >
                  {item}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.helperText}>
            Choose the maximum amount you want to spend.
          </Text>
          <View style={styles.choiceRow}>
            {fixedAmounts.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.choice,
                  fixedBudget === item && styles.selectedChoice,
                ]}
                onPress={() => {
                  setFixedBudget(item);
                  setNotice("");
                }}
              >
                <Text
                  style={[
                    styles.choiceText,
                    fixedBudget === item && styles.selectedChoiceText,
                  ]}
                >
                  {money(item)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={styles.budgetSummary}>
        <View>
          <Text style={styles.helperText}>Your maximum data budget</Text>
          <Text style={styles.budgetAmount}>{money(budget)}</Text>
        </View>
        <Text style={styles.budgetIcon}>↗</Text>
      </View>

      <Text style={styles.helperText}>
        Based on your current balance of {money(balance)}.
      </Text>
    </View>
  );

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Text style={styles.brand}>ZeroDataTopUp</Text>
          <Text style={styles.helperText}>
            Loading your saved balance and transactions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06111F" />

      <ScrollView contentContainerStyle={styles.content}>
        <Header />

        {screen === "home" && (
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>STAY CONNECTED</Text>
              <Text style={styles.heroTitle}>
                Data Don Finish?{"\n"}
                <Text style={styles.green}>No worry, we dey for you.</Text>
              </Text>
              <Text style={styles.heroDescription}>
                Set your budget, choose a data bundle, and get back to what
                matters.
              </Text>
            </View>

            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>AVAILABLE DEMO BALANCE</Text>
              <Text style={styles.balanceAmount}>{money(balance)}</Text>
              <Text style={styles.balanceFootnote}>
                Simulated balance · No real money is used
              </Text>
            </View>

            <BudgetPanel />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setNotice("");
                setScreen("topup");
              }}
            >
              <Text style={styles.primaryButtonText}>Get emergency data →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setScreen("history")}
            >
              <Text style={styles.secondaryButtonText}>
                View transaction history →
              </Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setEditProfile(profile);
                  setProfileNotice("");
                  setScreen("profile");
                }}
              >
                <Text style={styles.secondaryButtonText}>My profile →</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>✓</Text>
              <Text style={styles.infoText}>
                Choose how much you want to spend
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>✓</Text>
              <Text style={styles.infoText}>
                Stay within your selected budget
              </Text>
            </View>
          </>
        )}

        {screen === "topup" && (
          <>
            <Text style={styles.pageTitle}>Emergency top-up</Text>
            <Text style={styles.pageDescription}>
              Choose your network and a bundle within your budget.
            </Text>

            <BudgetPanel />

            <Text style={styles.sectionLabel}>1. SELECT NETWORK</Text>
            <View style={styles.networkGrid}>
              {networks.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.networkCard,
                    network.name === item.name && styles.selectedNetwork,
                  ]}
                  onPress={() => setNetwork(item)}
                >
                  <View
                    style={[styles.networkDot, { backgroundColor: item.color }]}
                  />
                  <Text style={styles.networkName}>{item.name}</Text>
                  {network.name === item.name && (
                    <Text style={styles.selectedMark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>2. CHOOSE DATA BUNDLE</Text>
            {bundles.map((item) => {
              const overBudget = item.price > budget;
              const selected =
                bundle.data === item.data && bundle.price === item.price;

              return (
                <TouchableOpacity
                  key={item.data}
                  style={[
                    styles.bundleCard,
                    selected && styles.selectedBundle,
                    overBudget && styles.overBudgetBundle,
                  ]}
                  onPress={() => {
                    setBundle(item);
                    setNotice("");
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bundleData}>{item.data}</Text>
                    <Text style={styles.bundlePrice}>{money(item.price)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    {overBudget && (
                      <Text style={styles.overBudgetText}>Over budget</Text>
                    )}
                    <Text style={styles.radioMark}>{selected ? "◉" : "○"}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={styles.totalRow}>
              <Text style={styles.helperText}>Selected bundle</Text>
              <Text style={styles.totalAmount}>{money(bundle.price)}</Text>
            </View>

            <Text style={styles.helperText}>
              Budget: {money(budget)} · Remaining after purchase:{" "}
              {money(Math.max(0, balance - bundle.price))}
            </Text>

            {notice !== "" && <Text style={styles.errorText}>{notice}</Text>}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={reviewPurchase}
            >
              <Text style={styles.primaryButtonText}>Review purchase →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setNotice("");
                setScreen("home");
              }}
            >
              <Text style={styles.secondaryButtonText}>← Back to home</Text>
            </TouchableOpacity>
          </>
        )}

        {screen === "review" && (
          <>
            <Text style={styles.pageTitle}>Review purchase</Text>
            <Text style={styles.pageDescription}>
              Check these details before confirming your demo transaction.
            </Text>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>PURCHASE SUMMARY</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Network</Text>
                <Text style={styles.detailValue}>{network.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Data bundle</Text>
                <Text style={styles.detailValue}>{bundle.data}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Budget limit</Text>
                <Text style={styles.detailValue}>{money(budget)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment amount</Text>
                <Text style={styles.detailValue}>{money(bundle.price)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Balance before</Text>
                <Text style={styles.detailValue}>{money(balance)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Balance after</Text>
                <Text style={styles.greenValue}>
                  {money(balance - bundle.price)}
                </Text>
              </View>
            </View>

            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Demo transaction</Text>
              <Text style={styles.helperText}>
                Confirming will deduct the amount from your simulated balance
                only. It will not purchase real mobile data.
              </Text>
            </View>

            {notice !== "" && <Text style={styles.errorText}>{notice}</Text>}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={confirmPurchase}
            >
              <Text style={styles.primaryButtonText}>
                Confirm demo purchase
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setNotice("");
                setScreen("topup");
              }}
            >
              <Text style={styles.secondaryButtonText}>← Edit selection</Text>
            </TouchableOpacity>
          </>
        )}
        {screen === "profile" && (
          <>
            <Text style={styles.pageTitle}>My Profile</Text>
            <Text style={styles.pageDescription}>
              Manage your personal details and view your ZeroDataTopUp activity.
            </Text>

            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.fullName.trim()
                    ? profile.fullName
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0].toUpperCase())
                        .join("")
                    : "U"}
                </Text>
              </View>

              <Text style={styles.profileName}>
                {profile.fullName || "Your name"}
              </Text>
              <Text style={styles.helperText}>ZeroDataTopUp demo user</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>PERSONAL INFORMATION</Text>

              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput
                style={styles.profileInput}
                placeholder="Enter your full name"
                placeholderTextColor="#71849A"
                value={editProfile.fullName}
                onChangeText={(value) =>
                  setEditProfile((previous) => ({
                    ...previous,
                    fullName: value,
                  }))
                }
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Email address</Text>
              <TextInput
                style={styles.profileInput}
                placeholder="Enter your email"
                placeholderTextColor="#71849A"
                value={editProfile.email}
                onChangeText={(value) =>
                  setEditProfile((previous) => ({
                    ...previous,
                    email: value,
                  }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Phone number</Text>
              <TextInput
                style={styles.profileInput}
                placeholder="Enter your phone number"
                placeholderTextColor="#71849A"
                value={editProfile.phone}
                onChangeText={(value) =>
                  setEditProfile((previous) => ({
                    ...previous,
                    phone: value,
                  }))
                }
                keyboardType="phone-pad"
              />

              {profileNotice !== "" && (
                <Text style={styles.profileNotice}>{profileNotice}</Text>
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={saveUserProfile}
              >
                <Text style={styles.primaryButtonText}>Save profile</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>ACCOUNT OVERVIEW</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Demo balance</Text>
                <Text style={styles.greenValue}>{money(balance)}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transactions</Text>
                <Text style={styles.detailValue}>{transactions.length}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account type</Text>
                <Text style={styles.detailValue}>Demo account</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setScreen("history")}
            >
              <Text style={styles.secondaryButtonText}>
                View transaction history →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setProfileNotice("");
                setScreen("home");
              }}
            >
              <Text style={styles.secondaryButtonText}>
                ← Back to dashboard
              </Text>
            </TouchableOpacity>
          </>
        )}
        {screen === "history" && (
          <>
            <Text style={styles.pageTitle}>Transaction History</Text>
            <Text style={styles.pageDescription}>
              Review your previous demo data purchases.
            </Text>

            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>TOTAL TRANSACTIONS</Text>
              <Text style={styles.balanceAmount}>{transactions.length}</Text>
              <Text style={styles.balanceFootnote}>
                Total spent:{" "}
                {money(
                  transactions.reduce((total, item) => total + item.amount, 0),
                )}
              </Text>
            </View>

            {transactions.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.bundleData}>No transactions yet</Text>
                <Text style={styles.helperText}>
                  Your successful demo purchases will appear here.
                </Text>
              </View>
            ) : (
              transactions.map((item) => (
                <View key={item.receipt} style={styles.card}>
                  <View style={styles.detailRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bundleData}>
                        {item.network} · {item.data}
                      </Text>
                      <Text style={styles.helperText}>{item.date}</Text>
                    </View>
                    <Text style={styles.greenValue}>-{money(item.amount)}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Receipt</Text>
                    <Text style={styles.detailValue}>{item.receipt}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Remaining balance</Text>
                    <Text style={styles.greenValue}>
                      {money(item.remainingBalance)}
                    </Text>
                  </View>

                  <Text style={styles.demoText}>DEMO TRANSACTION</Text>
                </View>
              ))
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setScreen("topup")}
            >
              <Text style={styles.primaryButtonText}>
                Make another purchase →
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setScreen("home")}
            >
              <Text style={styles.secondaryButtonText}>
                ← Back to dashboard
              </Text>
            </TouchableOpacity>
          </>
        )}

        {screen === "success" && (
          <>
            <View style={styles.successCircle}>
              <Text style={styles.successCheck}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Demo purchase complete!</Text>
            <Text style={styles.pageDescription}>
              Your simulated transaction was processed successfully.
            </Text>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>DEMO RECEIPT</Text>
              <Text style={styles.receiptNumber}>{receipt}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Network</Text>
                <Text style={styles.detailValue}>{network.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Data bundle</Text>
                <Text style={styles.detailValue}>{bundle.data}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount deducted</Text>
                <Text style={styles.detailValue}>{money(bundle.price)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Remaining balance</Text>
                <Text style={styles.greenValue}>{money(balance)}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={startAgain}>
              <Text style={styles.primaryButtonText}>Back to dashboard</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.footer}>ZERODATATOPUP · PROTOTYPE ONLY</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06111F",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    gap: 12,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#24E6A0",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#06111F",
    fontSize: 25,
    fontWeight: "900",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  tagline: {
    color: "#91A3B8",
    fontSize: 11,
    marginTop: 3,
  },
  demoBadge: {
    borderWidth: 1,
    borderColor: "#24E6A0",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  demoText: {
    color: "#24E6A0",
    fontSize: 10,
    fontWeight: "800",
  },
  hero: {
    marginBottom: 22,
  },
  eyebrow: {
    color: "#24E6A0",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 43,
  },
  green: {
    color: "#24E6A0",
  },
  heroDescription: {
    color: "#91A3B8",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  balanceCard: {
    backgroundColor: "#102B36",
    borderWidth: 1,
    borderColor: "#1D5B52",
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
  },
  balanceLabel: {
    color: "#A7C8C5",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 10,
  },
  balanceFootnote: {
    color: "#A7C8C5",
    fontSize: 11,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#101F30",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1D3045",
    padding: 18,
    marginBottom: 18,
  },
  sectionLabel: {
    color: "#9AADC2",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 14,
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: "#081624",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 9,
  },
  activeMode: {
    backgroundColor: "#24E6A0",
  },
  modeText: {
    color: "#AAB9C9",
    fontSize: 12,
    fontWeight: "700",
  },
  activeModeText: {
    color: "#06111F",
  },
  helperText: {
    color: "#91A3B8",
    fontSize: 12,
    lineHeight: 19,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 18,
  },
  choice: {
    flexGrow: 1,
    minWidth: 54,
    paddingVertical: 12,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: "#081624",
    borderWidth: 1,
    borderColor: "#263A50",
    alignItems: "center",
  },
  selectedChoice: {
    backgroundColor: "#123C36",
    borderColor: "#24E6A0",
  },
  choiceText: {
    color: "#D8E2ED",
    fontSize: 12,
    fontWeight: "700",
  },
  selectedChoiceText: {
    color: "#24E6A0",
  },
  budgetSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#081624",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  budgetAmount: {
    color: "#24E6A0",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  budgetIcon: {
    color: "#24E6A0",
    fontSize: 24,
    fontWeight: "800",
  },
  primaryButton: {
    backgroundColor: "#24E6A0",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 14,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#06111F",
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#2B4057",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#C2D0DF",
    fontSize: 13,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  infoIcon: {
    color: "#24E6A0",
    fontWeight: "900",
  },
  infoText: {
    color: "#AAB9C9",
    fontSize: 12,
  },
  pageTitle: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "900",
    marginBottom: 8,
  },
  pageDescription: {
    color: "#91A3B8",
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 20,
  },
  networkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  networkCard: {
    width: "48%",
    flexGrow: 1,
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#101F30",
    borderWidth: 1,
    borderColor: "#1D3045",
    borderRadius: 13,
    padding: 15,
  },
  selectedNetwork: {
    borderColor: "#24E6A0",
    backgroundColor: "#102D2D",
  },
  networkDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  networkName: {
    color: "#FFFFFF",
    fontWeight: "700",
    flex: 1,
  },
  selectedMark: {
    color: "#24E6A0",
    fontWeight: "900",
  },
  bundleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101F30",
    borderWidth: 1,
    borderColor: "#1D3045",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  selectedBundle: {
    borderColor: "#24E6A0",
    backgroundColor: "#102D2D",
  },
  overBudgetBundle: {
    opacity: 0.7,
  },
  bundleData: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  bundlePrice: {
    color: "#24E6A0",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
  },
  overBudgetText: {
    color: "#FFB86B",
    fontSize: 10,
    marginBottom: 5,
  },
  radioMark: {
    color: "#24E6A0",
    fontSize: 22,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  totalAmount: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  errorText: {
    color: "#FF8888",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#203248",
  },
  detailLabel: {
    color: "#91A3B8",
    fontSize: 12,
  },
  detailValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  greenValue: {
    color: "#24E6A0",
    fontSize: 13,
    fontWeight: "800",
  },
  noticeCard: {
    backgroundColor: "#17283A",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  noticeTitle: {
    color: "#FFCB83",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },
  successCircle: {
    alignSelf: "center",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#123C36",
    borderWidth: 1,
    borderColor: "#24E6A0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  successCheck: {
    color: "#24E6A0",
    fontSize: 38,
    fontWeight: "900",
  },
  successTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  receiptNumber: {
    color: "#24E6A0",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
  },
  footer: {
    color: "#52677D",
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 28,
  },
  profileCard: {
    backgroundColor: "#101F30",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1D3045",
    padding: 24,
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#123C36",
    borderWidth: 2,
    borderColor: "#24E6A0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    color: "#24E6A0",
    fontSize: 25,
    fontWeight: "900",
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 6,
  },
  fieldLabel: {
    color: "#C2D0DF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 7,
  },
  profileInput: {
    backgroundColor: "#081624",
    borderWidth: 1,
    borderColor: "#263A50",
    borderRadius: 11,
    color: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 14,
  },
  profileNotice: {
    color: "#24E6A0",
    fontSize: 12,
    marginTop: 14,
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#123C36",
    borderWidth: 1.5,
    borderColor: "#24E6A0",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarButtonText: {
    color: "#24E6A0",
    fontSize: 13,
    fontWeight: "900",
  },
});
