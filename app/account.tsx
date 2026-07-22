import {
  createShopifyCustomer,
  getShopifyCustomer,
  recoverShopifyCustomer,
  saveShopifyCustomerAddress,
  setDefaultShopifyCustomerAddress,
  ShopifyAddressInput,
  ShopifyCustomer,
  ShopifyCustomerAddress,
  ShopifyCustomerOrder,
  signInShopifyCustomer,
  updateShopifyCustomer,
} from '@/services/shopify';
import { fetchAdmin } from '@/services/admin-api';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from '@/services/storage';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalization } from '@/components/localization-context';
import type { TranslationKey } from '@/localization/en';
import { hasArabicText } from '@/services/locale';

const TOKEN_KEY = 'shopify_customer_access_token';
const EXPO_PUSH_TOKEN_KEY = 'expo_push_token';
const CUSTOMER_EMAIL_KEY = 'shopify_customer_email';
const CUSTOMER_PHONE_KEY = 'shopify_customer_phone';
const LOYALTY_REWARD_CODE_KEY = 'loyalty_reward_code';
type AccountSection = 'profile' | 'rewards' | 'addresses' | 'orders';
const ACCOUNT_SECTIONS: { id: AccountSection; labelKey: TranslationKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'profile', labelKey: 'account.profile', icon: 'person-outline' },
  { id: 'rewards', labelKey: 'account.rewards', icon: 'sparkles-outline' },
  { id: 'addresses', labelKey: 'account.addresses', icon: 'location-outline' },
  { id: 'orders', labelKey: 'account.orders', icon: 'receipt-outline' },
];
type LoyaltySummary = { programName: string; enabled: boolean; points: number; lifetimePoints: number; pointsPerItem: number; pointsPerCurrencyUnit: number; minimumRedemptionPoints: number; rewardExpiryDays: number; silverTierPoints: number; goldTierPoints: number; vipTierPoints: number; currencyCode: string; transactions: { id: string; points: number; note: string; rewardCode?: string; rewardAmount?: number; currencyCode?: string; expiresAt?: string; createdAt: string }[] };
type LoyaltyReward = { code: string; amount: number; currencyCode: string; expiresAt: string };
const emptyAddress: ShopifyAddressInput = { firstName: '', lastName: '', address1: '', address2: '', city: '', province: '', country: 'Lebanon', zip: '', phone: '' };

export default function AccountScreen() {
  const { locale, t, formatDate } = useLocalization();
  const [mode, setMode] = useState<'signin' | 'create' | 'recover'>('signin');
  const [section, setSection] = useState<AccountSection>('profile');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [customer, setCustomer] = useState<ShopifyCustomer | null>(null);
  const [address, setAddress] = useState<ShopifyAddressInput>(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState<string>();
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShopifyCustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loyalty, setLoyalty] = useState<LoyaltySummary | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(true);
  const [loyaltyError, setLoyaltyError] = useState('');
  const [redeemPoints, setRedeemPoints] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [combiningRewards, setCombiningRewards] = useState(false);
  const [loyaltyReward, setLoyaltyReward] = useState<LoyaltyReward | null>(null);

  // Refresh localized Shopify customer/order fields when the language changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadCustomer(); }, [locale]);

  const loadLoyalty = async (customerAccessToken: string) => {
    setLoyaltyLoading(true); setLoyaltyError('');
    try {
      const response = await fetchAdmin('/api/loyalty/customer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerAccessToken }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(t("account.rewardsConnectionError"));
      setLoyalty(result);
      const activeReward = (result?.transactions || []).find((transaction: LoyaltySummary['transactions'][number]) => transaction.rewardCode && (!transaction.expiresAt || new Date(transaction.expiresAt).getTime() > Date.now()));
      if (activeReward?.rewardCode) await SecureStore.setItemAsync(LOYALTY_REWARD_CODE_KEY, activeReward.rewardCode);
      else await SecureStore.deleteItemAsync(LOYALTY_REWARD_CODE_KEY);
    } catch (reason) {
      setLoyalty(null);
      setLoyaltyError(friendlyError(reason, t("account.rewardsConnectionError")));
    } finally { setLoyaltyLoading(false); }
  };

  const loadCustomer = async (providedToken?: string) => {
    try {
      const token = providedToken ?? await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) { setCustomer(null); return; }
      const profile = await getShopifyCustomer(token);
      if (!profile) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(CUSTOMER_EMAIL_KEY);
        await SecureStore.deleteItemAsync(CUSTOMER_PHONE_KEY);
        await SecureStore.deleteItemAsync(LOYALTY_REWARD_CODE_KEY);
      }
      setCustomer(profile);
      if (profile) {
        if (profile.email) await SecureStore.setItemAsync(CUSTOMER_EMAIL_KEY, profile.email.toLowerCase());
        else await SecureStore.deleteItemAsync(CUSTOMER_EMAIL_KEY);
        if (profile.phone) await SecureStore.setItemAsync(CUSTOMER_PHONE_KEY, profile.phone);
        else await SecureStore.deleteItemAsync(CUSTOMER_PHONE_KEY);
        await syncNotificationIdentity(profile);
        await loadLoyalty(token);
        setFirstName(profile.firstName ?? '');
        setLastName(profile.lastName ?? '');
        setPhone(profile.phone ?? '');
      }
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(CUSTOMER_EMAIL_KEY);
      await SecureStore.deleteItemAsync(CUSTOMER_PHONE_KEY);
      await SecureStore.deleteItemAsync(LOYALTY_REWARD_CODE_KEY);
      setCustomer(null);
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (mode === 'recover') {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t("account.validEmail"));
      try {
        setLoading(true); clearNotice();
        await recoverShopifyCustomer(email.trim());
        setMessage(t("account.resetSent"));
      } catch (reason) { setError(friendlyError(reason, t("account.resetSendError"))); }
      finally { setLoading(false); }
      return;
    }
    const normalizedPhone = normalizeLebanesePhone(phone);
    if (!email.trim() || password.length < 5 || (mode === 'create' && (!firstName.trim() || !lastName.trim() || !normalizedPhone))) {
      return setError(t("account.completeFields"));
    }
    try {
      setLoading(true); clearNotice();
      if (mode === 'create') await createShopifyCustomer({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: normalizedPhone, password });
      const session = await signInShopifyCustomer(email.trim(), password);
      await SecureStore.setItemAsync(TOKEN_KEY, session.accessToken);
      setPassword('');
      await loadCustomer(session.accessToken);
    } catch (reason) { setError(friendlyError(reason, t("account.accessError"))); }
    finally { setLoading(false); }
  };

  const saveProfile = async () => {
    if (password && (password.length < 5 || password !== confirmPassword)) return setError(t("account.passwordMismatch"));
    try {
      setLoading(true); clearNotice();
      const token = await requireToken(t("account.sessionExpired"));
      const result = await updateShopifyCustomer(token, {
        firstName: firstName.trim(), lastName: lastName.trim(),
        phone: phone.trim() ? normalizeLebanesePhone(phone) : undefined,
        ...(password ? { password } : {}),
      });
      const activeToken = result.customerAccessToken?.accessToken ?? token;
      if (activeToken !== token) await SecureStore.setItemAsync(TOKEN_KEY, activeToken);
      setPassword(''); setConfirmPassword('');
      await loadCustomer(activeToken);
      setMessage(t("account.profileUpdated"));
    } catch (reason) { setError(friendlyError(reason, t("account.profileUpdateError"))); }
    finally { setLoading(false); }
  };

  const redeemReward = async () => {
    const minimum = loyalty?.minimumRedemptionPoints ?? 0;
    const points = Number(redeemPoints || minimum);
    if (!Number.isInteger(points) || points < minimum) return setError(t("account.minimumRedemption", { count: minimum }));
    try {
      setRedeeming(true); clearNotice(); setLoyaltyReward(null);
      const token = await requireToken(t("account.sessionExpired"));
      const response = await fetchAdmin('/api/loyalty/customer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'redeem', points, customerAccessToken: token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(t("account.rewardCreateError"));
      setLoyaltyReward(result.reward);
      await SecureStore.setItemAsync(LOYALTY_REWARD_CODE_KEY, result.reward.code);
      setRedeemPoints('');
      await loadCustomer(token);
      setMessage(t("account.rewardCreated", { count: points, code: result.reward.code }));
    } catch (reason) { setError(friendlyError(reason, t("account.rewardCreateError"))); }
    finally { setRedeeming(false); }
  };

  const combineRewards = async () => {
    try {
      setCombiningRewards(true); clearNotice();
      const token=await requireToken(t("account.sessionExpired"));
      const response=await fetchAdmin('/api/loyalty/customer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'merge',customerAccessToken:token})});
      const result=await response.json();if(!response.ok)throw new Error(t("account.rewardsCombineError"));
      setLoyaltyReward(result.reward);await SecureStore.setItemAsync(LOYALTY_REWARD_CODE_KEY,result.reward.code);await loadLoyalty(token);setMessage(t("account.rewardsCombined", { count: result.mergedCount, code: result.reward.code }));
    } catch(reason){setError(friendlyError(reason,t("account.rewardsCombineError")));}
    finally{setCombiningRewards(false)}
  };

  const saveAddress = async () => {
    if (!address.firstName?.trim() || !address.lastName?.trim() || !address.address1.trim() || !address.city.trim() || !address.country.trim()) return setError(t("account.addressRequired"));
    try {
      setLoading(true); clearNotice();
      const token = await requireToken(t("account.sessionExpired"));
      await saveShopifyCustomerAddress(token, address, editingAddressId);
      await loadCustomer(token);
      setShowAddressForm(false); setEditingAddressId(undefined); setAddress(emptyAddress);
      setMessage(t("account.addressSaved"));
    } catch (reason) { setError(friendlyError(reason, t("account.addressSaveError"))); }
    finally { setLoading(false); }
  };

  const makeDefault = async (id: string) => {
    try {
      setLoading(true); clearNotice();
      const token = await requireToken(t("account.sessionExpired"));
      await setDefaultShopifyCustomerAddress(token, id);
      await loadCustomer(token);
      setMessage(t("account.defaultAddressUpdated"));
    } catch (reason) { setError(friendlyError(reason, t("account.defaultAddressError"))); }
    finally { setLoading(false); }
  };

  const editAddress = (item: ShopifyCustomerAddress) => {
    setAddress({ firstName: item.firstName ?? '', lastName: item.lastName ?? '', address1: item.address1 ?? '', address2: item.address2 ?? '', city: item.city ?? '', province: item.province ?? '', country: item.country ?? 'Lebanon', zip: item.zip ?? '', phone: item.phone ?? '' });
    setEditingAddressId(item.id); setShowAddressForm(true); clearNotice();
  };

  const signOut = async () => { await clearNotificationIdentity(); await SecureStore.deleteItemAsync(TOKEN_KEY); await SecureStore.deleteItemAsync(CUSTOMER_EMAIL_KEY); await SecureStore.deleteItemAsync(CUSTOMER_PHONE_KEY); await SecureStore.deleteItemAsync(LOYALTY_REWARD_CODE_KEY); setCustomer(null); setLoyalty(null); setLoyaltyReward(null); setLoyaltyError(''); setMode('signin'); clearNotice(); };
  const clearNotice = () => { setError(''); setMessage(''); };

  if (loading && !customer) return <View style={styles.center}><ActivityIndicator size="large" color="#002041" /></View>;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {customer ? <>
          <View style={styles.accountHero}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(customer.displayName || customer.email || 'C').split(/\s+/).slice(0, 2).map(value => value[0]).join('').toUpperCase()}</Text></View>
            <View style={styles.accountHeroCopy}><Text style={styles.accountEyebrow}>{t("account.myAccount")}</Text><Text style={styles.accountName}>{t("account.hello", { name: customer.displayName })}</Text><Text style={styles.accountEmail} numberOfLines={1}>{customer.email}</Text></View>
            <View style={styles.verifiedIcon}><Ionicons name="shield-checkmark" size={21} color="#197451" /></View>
          </View>
          <View style={styles.accountTabs}>
            {ACCOUNT_SECTIONS.map((item) => { const active = section === item.id; return <TouchableOpacity key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.accountTab, active && styles.accountTabActive]} onPress={() => { setSection(item.id); setSelectedOrder(null); clearNotice(); }}><Ionicons name={item.icon} size={19} color={active ? '#002041' : '#7b8794'} /><Text style={[styles.accountTabText, active && styles.accountTabTextActive]}>{t(item.labelKey)}</Text></TouchableOpacity>; })}
          </View>
          {section === 'profile' ? <ProfileForm {...{ firstName, setFirstName, lastName, setLastName, phone, setPhone, password, setPassword, confirmPassword, setConfirmPassword, saveProfile, loading }} /> : null}
          {section === 'rewards' ? <RewardsSection memberName={customer.displayName} loyalty={loyalty} loading={loyaltyLoading} error={loyaltyError} onRetry={()=>void requireToken(t("account.sessionExpired")).then(loadLoyalty).catch(reason=>setLoyaltyError(friendlyError(reason,t("account.signInAgain"))))} reward={loyaltyReward} redeemPoints={redeemPoints} setRedeemPoints={setRedeemPoints} redeeming={redeeming} combiningRewards={combiningRewards} onCombine={combineRewards} onRedeem={redeemReward}/> : null}
          {section === 'addresses' ? <View style={styles.section}>
            <SectionHeader icon="location-outline" title={t("account.savedAddresses")} copy={t("account.savedAddressesHelp")} />
            {customer.addresses.edges.length ? customer.addresses.edges.map(({ node }) => <View key={node.id} style={styles.card}>
              <View style={styles.cardTitleRow}><Text style={styles.cardTitle}>{node.firstName} {node.lastName}</Text>{customer.defaultAddress?.id === node.id ? <Text style={styles.badge}>{t("account.default")}</Text> : null}</View>
              <Text style={styles.cardCopy}>{node.formatted.join('\n')}</Text>
              <View style={styles.actionRow}><TouchableOpacity onPress={() => editAddress(node)}><Text style={styles.action}>{t("account.edit")}</Text></TouchableOpacity>{customer.defaultAddress?.id !== node.id ? <TouchableOpacity onPress={() => makeDefault(node.id)}><Text style={styles.action}>{t("account.makeDefault")}</Text></TouchableOpacity> : null}</View>
            </View>) : <Text style={styles.empty}>{t("account.noAddress")}</Text>}
            {showAddressForm ? <AddressForm {...{ address, setAddress, saveAddress, loading }} /> : <TouchableOpacity style={styles.primaryButton} onPress={() => { setAddress(emptyAddress); setEditingAddressId(undefined); setShowAddressForm(true); }}><Text style={styles.primaryText}>{t("account.addAddress")}</Text></TouchableOpacity>}
          </View> : null}
          {section === 'orders' ? <View style={styles.section}>
            {!selectedOrder ? <SectionHeader icon="receipt-outline" title={t("account.orderHistory")} copy={t("account.orderHistoryHelp")} /> : null}
            {selectedOrder ? <OrderDetails order={selectedOrder} onBack={() => setSelectedOrder(null)} /> : customer.orders.edges.length ? customer.orders.edges.map(({ node }) => <TouchableOpacity key={node.id} style={styles.card} activeOpacity={0.7} onPress={() => setSelectedOrder(node)} accessibilityRole="button" accessibilityLabel={t("account.viewOrderAccessibility", { name: node.name })}>
              <View style={styles.cardTitleRow}><Text style={styles.cardTitle}>{node.name}</Text><View style={styles.orderHeading}><Text style={styles.orderPrice}>{formatMoney(node.currentTotalPrice)}</Text><Ionicons name="chevron-forward" size={18} color="#006eb8" /></View></View>
              <Text style={styles.cardCopy}>{formatDate(node.processedAt)} · {localizedStatus(node.fulfillmentStatus, t)}</Text>
              <Text style={styles.viewOrder}>{t("account.viewOrder")}</Text>
            </TouchableOpacity>) : <Text style={styles.empty}>{t("account.noOrders")}</Text>}
          </View> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}{message ? <Text style={styles.success}>{message}</Text> : null}
          <TouchableOpacity style={styles.secondaryButton} onPress={signOut}><Text style={styles.secondaryText}>{t("account.signOut")}</Text></TouchableOpacity>
        </> : <AuthForm {...{ mode, setMode, firstName, setFirstName, lastName, setLastName, email, setEmail, phone, setPhone, password, setPassword, error, message, loading, submit, clearNotice }} />}
        <Link href="/" dismissTo style={styles.link}>{t("account.continueShopping")}</Link>
      </ScrollView>
    </SafeAreaView>
  );
}

function RewardsSection({ memberName, loyalty, loading, error, onRetry, reward, redeemPoints, setRedeemPoints, redeeming, combiningRewards, onCombine, onRedeem }: { memberName: string; loyalty: LoyaltySummary | null; loading: boolean; error: string; onRetry: () => void; reward: LoyaltyReward | null; redeemPoints: string; setRedeemPoints: (value: string) => void; redeeming: boolean; combiningRewards:boolean; onCombine:()=>void; onRedeem: () => void }) {
  const { t, formatDate, formatNumber } = useLocalization();
  if (loading) return <View style={styles.section}><View style={styles.rewardsLoading}><ActivityIndicator color="#002041"/><Text style={styles.rewardsHint}>{t("account.loadingRewards")}</Text></View></View>;
  if (!loyalty) return <View style={styles.section}><View style={styles.rewardsError}><View style={styles.rewardsErrorIcon}><Ionicons name="cloud-offline-outline" size={26} color="#a06a21"/></View><Text style={styles.rewardsErrorTitle}>{t("account.rewardsUnavailable")}</Text><Text style={styles.rewardsErrorCopy}>{error||t("account.rewardsConnectionError")}</Text><TouchableOpacity style={styles.primaryButton} onPress={onRetry}><Text style={styles.primaryText}>{t("common.retry")}</Text></TouchableOpacity></View></View>;
  const minimum = Math.max(1, loyalty.minimumRedemptionPoints);
  const remaining = Math.max(0, minimum - loyalty.points);
  const progress = Math.min(100, Math.round(loyalty.points / minimum * 100));
  const choices = [minimum, minimum * 2, minimum * 4];
  const selectedPoints = Number(redeemPoints || minimum);
  const selectedValue = Number.isFinite(selectedPoints) ? selectedPoints / Math.max(1, loyalty.pointsPerCurrencyUnit) : 0;
  const canRedeem = loyalty.enabled && Number.isInteger(selectedPoints) && selectedPoints >= minimum && selectedPoints <= loyalty.points && selectedPoints % loyalty.pointsPerCurrencyUnit === 0;
  const currency = loyalty.currencyCode || 'USD';
  const allActiveRewards = loyalty.transactions.filter(transaction=>transaction.rewardCode&&(!transaction.expiresAt||new Date(transaction.expiresAt).getTime()>Date.now()));
  const activeRewards = allActiveRewards.filter(transaction=>transaction.rewardCode!==reward?.code);
  const tier = loyalty.lifetimePoints >= loyalty.vipTierPoints ? 'vip' : loyalty.lifetimePoints >= loyalty.goldTierPoints ? 'gold' : loyalty.lifetimePoints >= loyalty.silverTierPoints ? 'silver' : 'member';
  const tierCardStyle = tier === 'vip' ? styles.rewardsCardVip : tier === 'gold' ? styles.rewardsCardGold : tier === 'silver' ? styles.rewardsCardSilver : styles.rewardsCardMember;
  const tierGlowStyle = tier === 'vip' ? styles.rewardsCardGlowVip : tier === 'gold' ? styles.rewardsCardGlowGold : tier === 'silver' ? styles.rewardsCardGlowSilver : styles.rewardsCardGlowMember;
  const rewardSteps = [t("account.rewardStepAdd"), t("account.rewardStepApply"), t("account.rewardStepCheckout")];
  const rewardExplanation: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string }[] = [
    { icon: 'bag-handle-outline', title: t("account.shopSignedIn"), copy: t("account.shopSignedInHelp") },
    { icon: 'sparkles-outline', title: t("account.earnAutomatically"), copy: t("account.earnAutomaticallyHelp", { count: loyalty.pointsPerItem }) },
    { icon: 'pricetag-outline', title: t("account.saveAtCheckout"), copy: t("account.saveAtCheckoutHelp") },
  ];
  return <View style={styles.section}>
    <View style={[styles.rewardsCard,tierCardStyle]}><View style={[styles.rewardsCardGlow,tierGlowStyle]}/><View style={styles.rewardsCardMain}><View><View style={styles.rewardsMemberBadge}><Ionicons name="sparkles" size={11} color="#f3cf68"/><Text style={styles.rewardsMemberBadgeText}>{t("account.rewardsTier", { tier: tier.toUpperCase() })}</Text></View><Text style={styles.rewardsEyebrow}>{loyalty.programName}</Text><Text style={styles.rewardsPoints}>{formatNumber(loyalty.points)}</Text><Text style={styles.rewardsLabel}>{t("account.pointsAvailable", { value: formatNumber(loyalty.points/loyalty.pointsPerCurrencyUnit, { maximumFractionDigits: 2 }), currency })}</Text></View><View style={styles.rewardsLifetime}><Ionicons name="star" size={30} color="#f3cf68"/><Text style={styles.rewardsLifetimeValue}>{formatNumber(loyalty.lifetimePoints)}</Text><Text style={styles.rewardsLifetimeLabel}>{t("account.lifetimeEarned")}</Text></View></View><View style={styles.rewardsCardFooter}><View><Text style={styles.rewardsCardMemberLabel}>{tier.toUpperCase()}</Text><Text style={styles.rewardsCardMemberName} numberOfLines={1}>{memberName||t("account.customer")}</Text></View><Text style={styles.rewardsCardFooterText}>CARTER&apos;S</Text></View></View>
    <View style={styles.rewardsBenefits}><View style={styles.rewardsBenefit}><Ionicons name="bag-check-outline" size={17} color="#006eb8"/><Text style={styles.rewardsBenefitText}>{t("account.earnEveryItem")}</Text></View><View style={styles.rewardsBenefit}><Ionicons name="shield-checkmark-outline" size={17} color="#006eb8"/><Text style={styles.rewardsBenefitText}>{t("account.secureRedemption")}</Text></View><View style={styles.rewardsBenefit}><Ionicons name="key-outline" size={17} color="#006eb8"/><Text style={styles.rewardsBenefitText}>{t("account.privateCodes")}</Text></View></View>
    <View style={styles.rewardProgressCard}><View style={styles.rewardProgressHeader}><Text style={styles.rewardProgressTitle}>{remaining ? t("account.pointsToReward", { count: remaining }) : t("account.rewardReady")}</Text><Text style={styles.rewardProgressCount}>{Math.min(loyalty.points,minimum)}/{minimum}</Text></View><View style={styles.rewardProgressTrack}><View style={[styles.rewardProgressFill,{width:`${progress}%`}]}/></View><Text style={styles.rewardsHint}>{remaining ? t("account.keepShoppingReward") : t("account.redeemFrom", { count: minimum })}</Text></View>
    {reward?<View style={styles.rewardCodeCard}><View style={styles.rewardCodeTop}><View><Text style={styles.rewardCodeLabel}>{t("account.newRewardReady")}</Text><Text style={styles.rewardCode}>{reward.code}</Text></View><Ionicons name="checkmark-circle" size={28} color="#19805c"/></View><Text style={styles.rewardCodeCopy}>{t("account.rewardOffExpires", { amount: reward.amount.toFixed(2), currency: reward.currencyCode, date: formatDate(reward.expiresAt) })}</Text><View style={styles.rewardUseSteps}>{rewardSteps.map(step=><Text key={step}>{step}</Text>)}</View></View>:null}
    {allActiveRewards.length?<><View style={styles.rewardSectionHead}><Text style={styles.sectionTitle}>{t("account.activeRewards")}</Text><Text style={styles.rewardSectionCount}>{t("account.available", { count: allActiveRewards.length })}</Text></View>{activeRewards.length?<View style={styles.activeRewardsList}>{activeRewards.map(transaction=><View style={styles.activeReward} key={transaction.id}><View style={styles.activeRewardIcon}><Ionicons name="ticket-outline" size={21} color="#12623f"/></View><View style={styles.rewardRowCopy}><Text style={styles.activeRewardCode}>{transaction.rewardCode}</Text><Text style={styles.activeRewardMeta}>{transaction.expiresAt?t("account.rewardOffExpires", { amount: transaction.rewardAmount?.toFixed(2)||t("account.reward"), currency: transaction.currencyCode||currency, date: formatDate(transaction.expiresAt) }):t("account.rewardOffReady", { amount: transaction.rewardAmount?.toFixed(2)||t("account.reward"), currency: transaction.currencyCode||currency })}</Text></View></View>)}</View>:null}{allActiveRewards.length>1?<View style={styles.combineRewardCard}><View style={styles.combineRewardCopy}><Text style={styles.combineRewardTitle}>{t("account.useAllRewards")}</Text><Text style={styles.combineRewardText}>{t("account.combineRewardsHelp")}</Text></View><TouchableOpacity disabled={combiningRewards} style={styles.combineRewardButton} onPress={onCombine}><Text style={styles.combineRewardButtonText}>{combiningRewards?t("account.combining"):t("account.combineRewards")}</Text></TouchableOpacity></View>:null}</>:null}
    <Text style={styles.sectionTitle}>{t("account.howRewardsWork")}</Text>
    <View style={styles.rewardHowCard}>{rewardExplanation.map(({icon,title,copy},index)=><View style={styles.rewardHowRow} key={title}><View style={styles.rewardHowIcon}><Ionicons name={icon} size={19} color="#006eb8"/></View><View style={styles.rewardHowCopy}><Text style={styles.rewardHowTitle}>{index+1}. {title}</Text><Text style={styles.rewardHowText}>{copy}</Text></View></View>)}</View>
    {loyalty.enabled ? <><Text style={styles.sectionTitle}>{t("account.redeemPoints")}</Text><View style={styles.redeemCard}><View style={styles.redeemHeading}><View style={styles.rewardRowCopy}><Text style={styles.redeemTitle}>{t("account.chooseCheckoutReward")}</Text><Text style={styles.redeemCopy}>{t("account.pointsRate", { count: loyalty.pointsPerCurrencyUnit, currency })}</Text></View><Ionicons name="gift-outline" size={25} color="#006eb8"/></View><View style={styles.rewardChoices}>{choices.map(choice=><TouchableOpacity key={choice} disabled={loyalty.points<choice} style={[styles.rewardChoice,selectedPoints===choice&&styles.rewardChoiceSelected,loyalty.points<choice&&styles.rewardChoiceDisabled]} onPress={()=>setRedeemPoints(String(choice))}><Text style={[styles.rewardChoiceValue,selectedPoints===choice&&styles.rewardChoiceValueSelected]}>{(choice/loyalty.pointsPerCurrencyUnit).toFixed(0)} {currency}</Text><Text style={[styles.rewardChoicePoints,selectedPoints===choice&&styles.rewardChoiceValueSelected]}>{formatNumber(choice)}</Text></TouchableOpacity>)}</View><Text style={styles.redeemInputLabel}>{t("account.customPoints")}</Text><TextInput style={styles.redeemInput} value={redeemPoints} onChangeText={setRedeemPoints} keyboardType="number-pad" placeholder={t("account.minimumPoints", { count: minimum })} placeholderTextColor="#8a96a1"/><View style={styles.redeemSummary}><Text>{t("account.rewardValue")}</Text><Text>{formatNumber(selectedValue, { maximumFractionDigits: 2 })} {currency}</Text></View><TouchableOpacity style={[styles.primaryButton,(redeeming||!canRedeem)&&styles.buttonDisabled]} disabled={redeeming||!canRedeem} onPress={onRedeem}><Text style={styles.primaryText}>{redeeming?t("account.creatingReward"):t("account.createReward")}</Text></TouchableOpacity>{remaining?<Text style={styles.redeemHelp}>{t("account.needMorePoints", { count: remaining })}</Text>:!canRedeem?<Text style={styles.redeemHelp}>{t("account.choosePointBlocks", { minimum, block: loyalty.pointsPerCurrencyUnit })}</Text>:<Text style={styles.redeemHelp}>{t("account.rewardValidity", { days: loyalty.rewardExpiryDays })}</Text>}</View></>:<View style={styles.rewardsPaused}><Ionicons name="pause-circle-outline" size={22} color="#8a6b22"/><Text>{t("account.redemptionPaused")}</Text></View>}
    <Text style={styles.sectionTitle}>{t("account.pointsActivity")}</Text>
    {loyalty.transactions.length ? loyalty.transactions.map(transaction=><View key={transaction.id} style={styles.rewardRow}><View style={styles.rewardRowCopy}><Text style={styles.rewardNote}>{transaction.note}</Text><Text style={styles.rewardDate}>{formatDate(transaction.createdAt)}</Text>{transaction.rewardCode?<View style={styles.rewardHistoryBox}><Text style={styles.rewardHistoryCode}>{transaction.rewardCode}</Text><Text style={styles.rewardHistoryMeta}>{transaction.expiresAt?t("account.expires", { date: formatDate(transaction.expiresAt) }):t("account.checkoutReward")}</Text></View>:null}</View><Text style={[styles.rewardValue,transaction.points<0&&styles.rewardValueNegative]}>{transaction.points>0?'+':''}{formatNumber(transaction.points)}</Text></View>) : <Text style={styles.empty}>{t("account.noRewardActivity")}</Text>}
    <View style={styles.rewardTerms}><Ionicons name="information-circle-outline" size={18} color="#6b7a86"/><Text style={styles.rewardTermsText}>{t("account.rewardTerms")}</Text></View>
  </View>;
}

function SectionHeader({ icon, title, copy }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string }) { const {isArabic}=useLocalization();return <View style={styles.sectionHeader}><View style={styles.sectionHeaderIcon}><Ionicons name={icon} size={21} color="#006eb8" /></View><View style={styles.sectionHeaderCopy}><Text style={[styles.sectionHeaderTitle,isArabic&&styles.arabicText]}>{title}</Text><Text style={[styles.sectionHeaderText,isArabic&&styles.arabicParagraph]}>{copy}</Text></View></View>; }

function ProfileForm(props: any) { const {t}=useLocalization();return <View style={styles.section}><SectionHeader icon="person-outline" title={t("account.personalDetails")} copy={t("account.personalDetailsHelp")} /><View style={styles.formCard}><View style={styles.nameRow}><Field placeholder={t("account.firstName")} value={props.firstName} onChangeText={props.setFirstName} half /><Field placeholder={t("account.lastName")} value={props.lastName} onChangeText={props.setLastName} half /></View><Field placeholder={t("account.phone")} value={props.phone} onChangeText={props.setPhone} keyboardType="phone-pad" /></View><SectionHeader icon="lock-closed-outline" title={t("account.passwordSecurity")} copy={t("account.passwordSecurityHelp")} /><View style={styles.formCard}><Field placeholder={t("account.newPassword")} value={props.password} onChangeText={props.setPassword} secureTextEntry /><Field placeholder={t("account.confirmPassword")} value={props.confirmPassword} onChangeText={props.setConfirmPassword} secureTextEntry /><PrimaryButton title={t("account.saveChanges")} onPress={props.saveProfile} loading={props.loading} /></View></View>; }

function AddressForm({ address, setAddress, saveAddress, loading }: any) { const {t}=useLocalization();const change = (key: keyof ShopifyAddressInput) => (value: string) => setAddress((current: ShopifyAddressInput) => ({ ...current, [key]: value })); return <View style={styles.formBox}><Text style={styles.sectionTitle}>{t("account.addressDetails")}</Text><View style={styles.nameRow}><Field placeholder={t("account.firstName")} value={address.firstName} onChangeText={change('firstName')} half /><Field placeholder={t("account.lastName")} value={address.lastName} onChangeText={change('lastName')} half /></View><Field placeholder={t("account.address")} value={address.address1} onChangeText={change('address1')} /><Field placeholder={t("account.address2")} value={address.address2} onChangeText={change('address2')} /><Field placeholder={t("account.city")} value={address.city} onChangeText={change('city')} /><Field placeholder={t("account.province")} value={address.province} onChangeText={change('province')} /><View style={styles.nameRow}><Field placeholder={t("account.postalCode")} value={address.zip} onChangeText={change('zip')} half /><Field placeholder={t("account.country")} value={address.country} onChangeText={change('country')} half /></View><Field placeholder={t("account.phoneShort")} value={address.phone} onChangeText={change('phone')} keyboardType="phone-pad" /><PrimaryButton title={t("account.saveAddress")} onPress={saveAddress} loading={loading} /></View>; }

function OrderDetails({ order, onBack }: { order: ShopifyCustomerOrder; onBack: () => void }) {
  const {t,formatDate,numericLocaleTag}=useLocalization();
  return <View>
    <TouchableOpacity style={styles.backButton} onPress={onBack}><Ionicons name="arrow-back" size={19} color="#006eb8" /><Text style={styles.action}>{t("account.backOrders")}</Text></TouchableOpacity>
    <Text style={styles.orderTitle}>{t("account.order",{name:order.name})}</Text>
    <Text style={styles.orderDate}>{t("account.placedOn",{date:formatDate(order.processedAt)})}</Text>
    <View style={styles.statusRow}><View style={styles.statusBox}><Text style={styles.statusLabel}>{t("account.payment")}</Text><Text style={styles.statusValue}>{localizedStatus(order.financialStatus ?? 'pending',t)}</Text></View><View style={styles.statusBox}><Text style={styles.statusLabel}>{t("account.delivery")}</Text><Text style={styles.statusValue}>{localizedStatus(order.fulfillmentStatus,t)}</Text></View></View>
    <Text style={styles.sectionTitle}>{t("account.items")}</Text>
    {order.lineItems.edges.map(({ node }, index) => <View key={`${node.title}-${index}`} style={styles.orderLine}><View style={styles.quantityBubble}><Text style={styles.quantityText}>{node.quantity}</Text></View><View style={styles.orderLineText}><Text style={styles.orderItemTitle}>{node.title}</Text><Text style={styles.cardCopy}>{t("account.quantity",{count:node.quantity})}</Text></View></View>)}
    <View style={styles.totalRow}><Text style={styles.totalLabel}>{t("account.orderTotal")}</Text><Text style={styles.totalValue}>{formatMoney(order.currentTotalPrice,numericLocaleTag)}</Text></View>
  </View>;
}

function AuthForm(props: any) { const {t,isArabic}=useLocalization();const title = props.mode === 'create' ? t("account.createAccount") : props.mode === 'recover' ? t("account.resetPassword") : t("account.welcomeBack"); return <View style={styles.authShell}><View style={styles.authIcon}><Ionicons name={props.mode === 'recover' ? 'key-outline' : 'person-outline'} size={28} color="#006eb8" /></View><Text style={styles.authEyebrow}>{t("account.customerAccount")}</Text><Text style={styles.title}>{title}</Text><Text style={[styles.copy,isArabic&&styles.arabicParagraph]}>{props.mode === 'recover' ? t("account.resetHelp") : t("account.signInHelp")}</Text><View style={styles.authCard}>{props.mode !== 'recover' ? <View style={styles.tabs}><Tab title={t("account.signIn")} active={props.mode === 'signin'} onPress={() => { props.setMode('signin'); props.clearNotice(); }} /><Tab title={t("account.createAccount")} active={props.mode === 'create'} onPress={() => { props.setMode('create'); props.clearNotice(); }} /></View> : null}{props.mode === 'create' ? <View style={styles.nameRow}><Field placeholder={t("account.firstName")} value={props.firstName} onChangeText={props.setFirstName} half /><Field placeholder={t("account.lastName")} value={props.lastName} onChangeText={props.setLastName} half /></View> : null}<Field placeholder={t("account.email")} keyboardType="email-address" autoCapitalize="none" value={props.email} onChangeText={props.setEmail} />{props.mode === 'create' ? <Field placeholder={t("account.phone")} keyboardType="phone-pad" value={props.phone} onChangeText={props.setPhone} /> : null}{props.mode !== 'recover' ? <Field placeholder={t("account.password")} secureTextEntry value={props.password} onChangeText={props.setPassword} /> : null}<TouchableOpacity style={styles.forgotButton} onPress={() => { props.setMode(props.mode === 'recover' ? 'signin' : 'recover'); props.clearNotice(); }}><Text style={styles.action}>{props.mode === 'recover' ? t("account.backToSignIn") : t("account.forgotPassword")}</Text></TouchableOpacity>{props.error ? <Text style={styles.error}>{props.error}</Text> : null}{props.message ? <Text style={styles.success}>{props.message}</Text> : null}<PrimaryButton title={props.mode === 'create' ? t("account.createAccount") : props.mode === 'recover' ? t("account.sendReset") : t("account.signIn")} onPress={props.submit} loading={props.loading} /></View><View style={styles.secureNote}><Ionicons name="shield-checkmark-outline" size={16} color="#607381" /><Text style={[styles.secureNoteText,isArabic&&styles.arabicParagraph]}>{t("account.secureShopify")}</Text></View></View>; }

function Field({ half, keyboardType, ...props }: any) { const {isArabic}=useLocalization();const keepLTR=keyboardType==='email-address'||keyboardType==='phone-pad'||keyboardType==='numeric'||keyboardType==='number-pad'||keyboardType==='decimal-pad';const useArabicDirection=isArabic&&!keepLTR&&(!props.value||hasArabicText(String(props.value)));return <TextInput style={[styles.input, half && styles.half, useArabicDirection&&styles.arabicInput]} keyboardType={keyboardType} placeholderTextColor="#768195" {...props} />; }
function Tab({ title, active, onPress }: any) { return <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}><Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text></TouchableOpacity>; }
function PrimaryButton({ title, onPress, loading }: any) { return <TouchableOpacity style={styles.primaryButton} disabled={loading} onPress={onPress}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{title}</Text>}</TouchableOpacity>; }
async function requireToken(expiredMessage: string) { const token = await SecureStore.getItemAsync(TOKEN_KEY); if (!token) throw new Error(expiredMessage); return token; }
function friendlyError(reason: unknown, fallback: string) { return reason instanceof Error && reason.message ? reason.message : fallback; }
function prettyStatus(value: string) { return value.toLowerCase().replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase()); }
function localizedStatus(value: string, t: (key: TranslationKey) => string) {
  const key = value.toLowerCase().replace(/[^a-z]/g, '');
  const statuses: Record<string, TranslationKey> = {
    pending: 'account.statusPending', paid: 'account.statusPaid', authorized: 'account.statusAuthorized',
    refunded: 'account.statusRefunded', partiallypaid: 'account.statusPartiallyPaid', partiallyrefunded: 'account.statusPartiallyRefunded',
    voided: 'account.statusVoided', fulfilled: 'account.statusFulfilled', unfulfilled: 'account.statusUnfulfilled',
    partial: 'account.statusPartial', partiallyfulfilled: 'account.statusPartial', restocked: 'account.statusRestocked',
    scheduled: 'account.statusScheduled', onhold: 'account.statusOnHold',
  };
  return statuses[key] ? t(statuses[key]) : prettyStatus(value);
}
function formatMoney(money: { amount: string; currencyCode: string }, locale?:string) { try { return new Intl.NumberFormat(locale, { style: 'currency', currency: money.currencyCode }).format(Number(money.amount)); } catch { return `${money.amount} ${money.currencyCode}`; } }
function normalizeLebanesePhone(value: string) { const trimmed = value.trim(); const digits = trimmed.replace(/\D/g, ''); if (digits.length < 7) return ''; if (trimmed.startsWith('+')) return `+${digits}`; if (digits.startsWith('961')) return `+${digits}`; if (digits.startsWith('0')) return `+961${digits.slice(1)}`; return `+961${digits}`; }
async function syncNotificationIdentity(customer: ShopifyCustomer) {
  const token = await SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY);
  if (!token) return;
  try {
    await fetchAdmin('/api/push/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, customerEmail: customer.email, customerPhone: customer.phone }) });
  } catch { /* Admin API may be offline while browsing the app. */ }
}
async function clearNotificationIdentity() {
  const token = await SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY);
  if (!token) return;
  try {
    await fetchAdmin('/api/push/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, customerEmail: null, customerPhone: null }) });
  } catch { /* Signing out must still work if the admin API is unavailable. */ }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7f9' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7f9' }, container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 50 }, icon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf3f4', marginTop: 12, marginBottom: 14 },
  title: { color: '#002041', fontSize: 26, lineHeight: 33, fontWeight: '900', textAlign: 'center' }, copy: { maxWidth: 410, color: '#657083', textAlign: 'center', lineHeight: 21, marginTop: 7, marginBottom: 18 }, section: { width: '100%', maxWidth: 520 }, sectionTitle: { color: '#002041', fontSize: 18, fontWeight: '900', marginBottom: 10, marginTop: 7 }, hint: { color: '#657083', marginTop: -5, marginBottom: 12 },
  accountHero: { width: '100%', maxWidth: 520, minHeight: 112, flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: '#002041', paddingHorizontal: 18, paddingVertical: 18, shadowColor: '#002041', shadowOffset: { width: 0, height: 7 }, shadowOpacity: .14, shadowRadius: 16, elevation: 5 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 3, borderColor: '#2d6286' }, avatarText: { color: '#002041', fontSize: 19, fontWeight: '900', letterSpacing: .5 }, accountHeroCopy: { flex: 1, marginLeft: 14 }, accountEyebrow: { color: '#8fc5e5', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, accountName: { color: '#fff', fontSize: 20, lineHeight: 26, fontWeight: '900', marginTop: 5 }, accountEmail: { color: '#c5d8e5', fontSize: 11, marginTop: 3 }, verifiedIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf8f1' },
  accountTabs: { width: '100%', maxWidth: 520, flexDirection: 'row', borderWidth: 1, borderColor: '#e1e7ec', borderRadius: 14, backgroundColor: '#fff', padding: 5, marginTop: 14, marginBottom: 20 }, accountTab: { flex: 1, minHeight: 59, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10 }, accountTabActive: { backgroundColor: '#eaf3f8' }, accountTabText: { color: '#7b8794', fontSize: 9, fontWeight: '800' }, accountTabTextActive: { color: '#002041', fontWeight: '900' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 13, marginTop: 3 }, sectionHeaderIcon: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf4fa' }, sectionHeaderCopy: { flex: 1 }, sectionHeaderTitle: { color: '#002041', fontSize: 17, fontWeight: '900' }, sectionHeaderText: { color: '#6d7a87', fontSize: 11, lineHeight: 16, marginTop: 3 }, formCard: { borderWidth: 1, borderColor: '#e0e6eb', borderRadius: 14, backgroundColor: '#fff', padding: 15, marginBottom: 22, shadowColor: '#14324a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .04, shadowRadius: 9, elevation: 1 },
  authShell: { width: '100%', maxWidth: 520, alignItems: 'center', paddingTop: 12 }, authIcon: { width: 64, height: 64, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf4fa', marginBottom: 14 }, authEyebrow: { color: '#006eb8', fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginBottom: 6 }, authCard: { width: '100%', borderWidth: 1, borderColor: '#e0e6eb', borderRadius: 17, backgroundColor: '#fff', padding: 17, shadowColor: '#14324a', shadowOffset: { width: 0, height: 7 }, shadowOpacity: .08, shadowRadius: 18, elevation: 3 }, secureNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 15, paddingHorizontal: 12 }, secureNoteText: { flex: 1, color: '#6b7a86', fontSize: 10, lineHeight: 15 },
  tabs: { width: '100%', maxWidth: 520, flexDirection: 'row', backgroundColor: '#f0f4f7', borderRadius: 9, padding: 4, marginBottom: 18 }, tab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, tabActive: { backgroundColor: '#fff' }, tabText: { color: '#718096', fontWeight: '700', fontSize: 13 }, tabTextActive: { color: '#002041', fontWeight: '900' },
  rewardsCard: { minHeight: 188, overflow: 'hidden', borderRadius: 18, backgroundColor: '#002041', padding: 21, marginBottom: 11 }, rewardsCardMember: { backgroundColor: '#002f50' }, rewardsCardSilver: { backgroundColor: '#465761' }, rewardsCardGold: { backgroundColor: '#674a0d' }, rewardsCardVip: { backgroundColor: '#32164f' }, rewardsCardGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -65, top: -80, backgroundColor: '#0c527d' }, rewardsCardGlowMember: { backgroundColor: '#1689bd' }, rewardsCardGlowSilver: { backgroundColor: '#b8c5cc' }, rewardsCardGlowGold: { backgroundColor: '#d6ad38' }, rewardsCardGlowVip: { backgroundColor: '#8b52bc' }, rewardsCardMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, rewardsCardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#ffffff35', marginTop: 17, paddingTop: 12 }, rewardsMemberBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, backgroundColor: '#ffffff20', paddingHorizontal: 8, paddingVertical: 5, marginBottom: 11 }, rewardsEyebrow: { color: '#d8e8f1', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, rewardsPoints: { color: '#fff', fontSize: 42, fontWeight: '900', marginTop: 8 }, rewardsLabel: { color: '#e2ebf0', fontSize: 10, fontWeight: '700', marginTop: 2 }, rewardsHint: { color: '#657083', fontSize: 12, lineHeight: 18, marginBottom: 18 }, rewardRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: '#e6eaee', paddingVertical: 11 }, rewardNote: { color: '#26384b', fontSize: 12, fontWeight: '800' }, rewardDate: { color: '#8995a0', fontSize: 10, marginTop: 4 }, rewardValue: { color: '#19805c', fontSize: 15, fontWeight: '900' }, rewardValueNegative: { color: '#b04a4a' },
  redeemCard: { borderWidth: 1, borderColor: '#c9dce9', borderRadius: 14, backgroundColor: '#f7fbfd', padding: 16, marginBottom: 18 }, redeemHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }, redeemTitle: { color: '#002041', fontSize: 16, fontWeight: '900' }, redeemCopy: { color: '#657083', fontSize: 11, lineHeight: 17, marginTop: 5 }, redeemInput: { height: 49, borderWidth: 1, borderColor: '#cbd7df', borderRadius: 8, backgroundColor: '#fff', color: '#17243a', paddingHorizontal: 13, marginBottom: 10 }, redeemHelp: { color: '#71808d', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 9 }, buttonDisabled: { opacity: 0.45 }, rewardCodeCard: { borderWidth: 1, borderColor: '#a9d5bd', borderRadius: 14, backgroundColor: '#eef9f3', padding: 17, marginBottom: 18 }, rewardCodeLabel: { color: '#39805e', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, rewardCode: { color: '#12623f', fontSize: 23, fontWeight: '900', letterSpacing: 1.2, marginTop: 7 }, rewardCodeCopy: { color: '#597166', fontSize: 11, marginTop: 6 }, rewardRowCopy: { flex: 1 }, rewardHistoryCode: { color: '#006eb8', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginTop: 4 },
  rewardsLoading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 }, rewardsError: { minHeight: 250, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ead7b5', borderRadius: 14, backgroundColor: '#fffaf1', padding: 22 }, rewardsErrorIcon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#f7ead1', marginBottom: 12 }, rewardsErrorTitle: { color: '#3c4650', fontSize: 17, fontWeight: '900', textAlign: 'center' }, rewardsErrorCopy: { color: '#746b5d', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7, marginBottom: 16 }, rewardsLifetime: { alignItems: 'center' }, rewardsLifetimeValue: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 5 }, rewardsLifetimeLabel: { color: '#9fc7e1', fontSize: 9, fontWeight: '700', marginTop: 2 }, rewardProgressCard: { borderWidth: 1, borderColor: '#dde5eb', borderRadius: 12, padding: 15, marginBottom: 20 }, rewardProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, rewardProgressTitle: { flex: 1, color: '#002041', fontSize: 13, fontWeight: '900' }, rewardProgressCount: { color: '#006eb8', fontSize: 12, fontWeight: '900' }, rewardProgressTrack: { height: 8, borderRadius: 4, backgroundColor: '#e8edf1', overflow: 'hidden', marginVertical: 12 }, rewardProgressFill: { height: '100%', borderRadius: 4, backgroundColor: '#f0bd35' }, rewardHowCard: { borderWidth: 1, borderColor: '#e0e6eb', borderRadius: 13, paddingHorizontal: 15, marginBottom: 20 }, rewardHowRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#edf0f2', paddingVertical: 14 }, rewardHowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf4fa' }, rewardHowCopy: { flex: 1 }, rewardHowTitle: { color: '#20384b', fontSize: 13, fontWeight: '900' }, rewardHowText: { color: '#71808c', fontSize: 11, lineHeight: 17, marginTop: 3 }, rewardChoices: { flexDirection: 'row', gap: 8, marginBottom: 14 }, rewardChoice: { flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cdd8df', borderRadius: 9, backgroundColor: '#fff' }, rewardChoiceSelected: { borderColor: '#006eb8', backgroundColor: '#006eb8' }, rewardChoiceDisabled: { opacity: 0.35 }, rewardChoiceValue: { color: '#002041', fontSize: 19, fontWeight: '900' }, rewardChoiceValueSelected: { color: '#fff' }, rewardChoicePoints: { color: '#74818c', fontSize: 9, fontWeight: '800', marginTop: 3 }, redeemInputLabel: { color: '#42596a', fontSize: 11, fontWeight: '800', marginBottom: 6 }, redeemSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 13 }, rewardCodeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, rewardUseSteps: { borderTopWidth: 1, borderTopColor: '#c9e3d5', gap: 7, marginTop: 13, paddingTop: 12 }, rewardHistoryBox: { alignSelf: 'flex-start', borderRadius: 6, backgroundColor: '#edf5fa', paddingHorizontal: 8, paddingVertical: 5, marginTop: 6 }, rewardHistoryMeta: { color: '#6d7c87', fontSize: 9, marginTop: 2 }, rewardsPaused: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#ead49f', borderRadius: 11, backgroundColor: '#fff9eb', padding: 14, marginBottom: 18 },
  rewardsMemberBadgeText: { color: '#f8e6a4', fontSize: 8, fontWeight: '900', letterSpacing: .7 }, rewardsCardFooterText: { alignSelf: 'flex-end', color: '#8fb2c8', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, rewardsCardMemberLabel: { color: '#7199b3', fontSize: 7, fontWeight: '900', letterSpacing: 1 }, rewardsCardMemberName: { maxWidth: 220, color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: .3, marginTop: 3 }, rewardsBenefits: { flexDirection: 'row', borderWidth: 1, borderColor: '#e1e7eb', borderRadius: 12, backgroundColor: '#fafcfd', paddingVertical: 12, marginBottom: 14 }, rewardsBenefit: { flex: 1, alignItems: 'center', gap: 5, paddingHorizontal: 5 }, rewardsBenefitText: { color: '#536776', fontSize: 8, fontWeight: '800', textAlign: 'center' }, rewardSectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, rewardSectionCount: { color: '#19805c', fontSize: 9, fontWeight: '900' }, activeRewardsList: { gap: 8 }, activeReward: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: '#b8dbc8', borderRadius: 11, backgroundColor: '#f2faf5', padding: 12 }, activeRewardIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#dcefe4' }, activeRewardCode: { color: '#12623f', fontSize: 14, fontWeight: '900', letterSpacing: .6 }, activeRewardMeta: { color: '#658073', fontSize: 10, marginTop: 4 }, combineRewardCard: { borderWidth: 1, borderColor: '#c7dbea', borderRadius: 12, backgroundColor: '#f4f9fc', padding: 14, marginTop: 10, marginBottom: 18 }, combineRewardCopy: { marginBottom: 11 }, combineRewardTitle: { color: '#173a53', fontSize: 13, fontWeight: '900' }, combineRewardText: { color: '#687b89', fontSize: 10, lineHeight: 15, marginTop: 4 }, combineRewardButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#006eb8' }, combineRewardButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' }, rewardTerms: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 10, backgroundColor: '#f1f4f6', padding: 13, marginTop: 17 }, rewardTermsText: { flex: 1, color: '#6b7a86', fontSize: 9, lineHeight: 14 },
  nameRow: { width: '100%', flexDirection: 'row', gap: 10 }, input: { width: '100%', height: 52, borderWidth: 1, borderColor: '#d7dfe7', borderRadius: 10, paddingHorizontal: 14, marginBottom: 11, color: '#17243a', backgroundColor: '#fff' }, half: { flex: 1 },
  arabicInput: { writingDirection: 'rtl', textAlign: 'right' },
  arabicText: { writingDirection: 'rtl' }, arabicParagraph: { writingDirection: 'rtl', textAlign: 'right' },
  primaryButton: { width: '100%', minHeight: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#002041', paddingHorizontal: 16 }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' }, secondaryButton: { width: '100%', maxWidth: 520, height: 50, borderWidth: 1, borderColor: '#d9b7b7', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginTop: 22 }, secondaryText: { color: '#9c3d3d', fontWeight: '800' },
  error: { width: '100%', maxWidth: 520, color: '#c5524a', lineHeight: 19, marginVertical: 12 }, success: { width: '100%', maxWidth: 520, color: '#287a54', lineHeight: 20, marginVertical: 12, textAlign: 'center' }, forgotButton: { width: '100%', alignItems: 'flex-end', paddingVertical: 5, marginTop: -5, marginBottom: 8 }, link: { color: '#002041', fontWeight: '700', marginTop: 18, padding: 10 },
  card: { borderWidth: 1, borderColor: '#dfe6ec', borderRadius: 14, backgroundColor: '#fff', padding: 16, marginBottom: 12, shadowColor: '#14324a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: .04, shadowRadius: 9, elevation: 1 }, cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, cardTitle: { flex: 1, color: '#002041', fontSize: 16, fontWeight: '900' }, cardCopy: { color: '#657083', lineHeight: 21, marginTop: 7 }, badge: { color: '#287a54', backgroundColor: '#e8f6ee', fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }, actionRow: { flexDirection: 'row', gap: 22, marginTop: 12 }, action: { color: '#006eb8', fontWeight: '800' }, orderPrice: { color: '#002041', fontWeight: '900' }, orderHeading: { flexDirection: 'row', alignItems: 'center', gap: 5 }, viewOrder: { color: '#006eb8', fontWeight: '800', marginTop: 12 }, empty: { color: '#657083', textAlign: 'center', marginVertical: 25 }, formBox: { borderWidth: 1, borderColor: '#e0e6eb', backgroundColor: '#fff', borderRadius: 14, padding: 15, marginTop: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 10 }, orderTitle: { color: '#002041', fontSize: 24, fontWeight: '900' }, orderDate: { color: '#657083', marginTop: 5, marginBottom: 18 }, statusRow: { flexDirection: 'row', gap: 10, marginBottom: 20 }, statusBox: { flex: 1, backgroundColor: '#f0f5f7', borderRadius: 9, padding: 12 }, statusLabel: { color: '#657083', fontSize: 12, fontWeight: '700', marginBottom: 4 }, statusValue: { color: '#002041', fontWeight: '900' }, orderLine: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e9ed', paddingVertical: 13 }, quantityBubble: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eaf3f4', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, quantityText: { color: '#002041', fontWeight: '900' }, orderLineText: { flex: 1 }, orderItemTitle: { color: '#17243a', fontWeight: '800' }, totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: '#002041', paddingTop: 15, marginTop: 20 }, totalLabel: { color: '#002041', fontSize: 17, fontWeight: '900' }, totalValue: { color: '#002041', fontSize: 19, fontWeight: '900' },
});
