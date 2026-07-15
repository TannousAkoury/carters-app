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
import * as SecureStore from 'expo-secure-store';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const TOKEN_KEY = 'shopify_customer_access_token';
const EXPO_PUSH_TOKEN_KEY = 'expo_push_token';
const CUSTOMER_EMAIL_KEY = 'shopify_customer_email';
const CUSTOMER_PHONE_KEY = 'shopify_customer_phone';
const LOYALTY_REWARD_CODE_KEY = 'loyalty_reward_code';
type LoyaltySummary = { programName: string; enabled: boolean; points: number; lifetimePoints: number; pointsPerItem: number; pointsPerCurrencyUnit: number; minimumRedemptionPoints: number; rewardExpiryDays: number; currencyCode: string; transactions: { id: string; points: number; note: string; rewardCode?: string; rewardAmount?: number; currencyCode?: string; expiresAt?: string; createdAt: string }[] };
type LoyaltyReward = { code: string; amount: number; currencyCode: string; expiresAt: string };
const emptyAddress: ShopifyAddressInput = { firstName: '', lastName: '', address1: '', address2: '', city: '', province: '', country: 'Lebanon', zip: '', phone: '' };

export default function AccountScreen() {
  const [mode, setMode] = useState<'signin' | 'create' | 'recover'>('signin');
  const [section, setSection] = useState<'profile' | 'rewards' | 'addresses' | 'orders'>('profile');
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

  // The initial account refresh intentionally runs once when this modal mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadCustomer(); }, []);

  const loadLoyalty = async (customerAccessToken: string) => {
    setLoyaltyLoading(true); setLoyaltyError('');
    try {
      const response = await fetchAdmin('/api/loyalty/customer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerAccessToken }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Rewards service is unavailable.');
      setLoyalty(result);
      const activeReward = (result?.transactions || []).find((transaction: LoyaltySummary['transactions'][number]) => transaction.rewardCode && (!transaction.expiresAt || new Date(transaction.expiresAt).getTime() > Date.now()));
      if (activeReward?.rewardCode) await SecureStore.setItemAsync(LOYALTY_REWARD_CODE_KEY, activeReward.rewardCode);
      else await SecureStore.deleteItemAsync(LOYALTY_REWARD_CODE_KEY);
    } catch (reason) {
      setLoyalty(null);
      setLoyaltyError(friendlyError(reason, 'Rewards could not be loaded. Make sure the admin server is running.'));
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
      setCustomer(null);
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (mode === 'recover') {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
      try {
        setLoading(true); clearNotice();
        await recoverShopifyCustomer(email.trim());
        setMessage('Shopify sent a password-reset link to your email. Please check your inbox and spam folder.');
      } catch (reason) { setError(friendlyError(reason, 'We could not send the reset email right now.')); }
      finally { setLoading(false); }
      return;
    }
    const normalizedPhone = normalizeLebanesePhone(phone);
    if (!email.trim() || password.length < 5 || (mode === 'create' && (!firstName.trim() || !lastName.trim() || !normalizedPhone))) {
      return setError('Please complete every field. Password must contain at least 5 characters.');
    }
    try {
      setLoading(true); clearNotice();
      if (mode === 'create') await createShopifyCustomer({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: normalizedPhone, password });
      const session = await signInShopifyCustomer(email.trim(), password);
      await SecureStore.setItemAsync(TOKEN_KEY, session.accessToken);
      setPassword('');
      await loadCustomer(session.accessToken);
    } catch (reason) { setError(friendlyError(reason, 'Unable to access your Shopify account.')); }
    finally { setLoading(false); }
  };

  const saveProfile = async () => {
    if (password && (password.length < 5 || password !== confirmPassword)) return setError('Passwords must match and contain at least 5 characters.');
    try {
      setLoading(true); clearNotice();
      const token = await requireToken();
      const result = await updateShopifyCustomer(token, {
        firstName: firstName.trim(), lastName: lastName.trim(),
        phone: phone.trim() ? normalizeLebanesePhone(phone) : undefined,
        ...(password ? { password } : {}),
      });
      const activeToken = result.customerAccessToken?.accessToken ?? token;
      if (activeToken !== token) await SecureStore.setItemAsync(TOKEN_KEY, activeToken);
      setPassword(''); setConfirmPassword('');
      await loadCustomer(activeToken);
      setMessage('Your account details were updated.');
    } catch (reason) { setError(friendlyError(reason, 'Unable to update your profile.')); }
    finally { setLoading(false); }
  };

  const redeemReward = async () => {
    const minimum = loyalty?.minimumRedemptionPoints ?? 0;
    const points = Number(redeemPoints || minimum);
    if (!Number.isInteger(points) || points < minimum) return setError(`Redeem at least ${minimum} whole points.`);
    try {
      setRedeeming(true); clearNotice(); setLoyaltyReward(null);
      const token = await requireToken();
      const response = await fetchAdmin('/api/loyalty/customer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'redeem', points, customerAccessToken: token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create your reward.');
      setLoyaltyReward(result.reward);
      await SecureStore.setItemAsync(LOYALTY_REWARD_CODE_KEY, result.reward.code);
      setRedeemPoints('');
      await loadCustomer(token);
      setMessage(`${points} points redeemed. Reward ${result.reward.code} will apply automatically at checkout.`);
    } catch (reason) { setError(friendlyError(reason, 'Unable to create your reward.')); }
    finally { setRedeeming(false); }
  };

  const combineRewards = async () => {
    try {
      setCombiningRewards(true); clearNotice();
      const token=await requireToken();
      const response=await fetchAdmin('/api/loyalty/customer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'merge',customerAccessToken:token})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to combine rewards.');
      setLoyaltyReward(result.reward);await SecureStore.setItemAsync(LOYALTY_REWARD_CODE_KEY,result.reward.code);await loadLoyalty(token);setMessage(`${result.mergedCount} rewards combined into ${result.reward.code}.`);
    } catch(reason){setError(friendlyError(reason,'Unable to combine rewards.'));}
    finally{setCombiningRewards(false)}
  };

  const saveAddress = async () => {
    if (!address.firstName?.trim() || !address.lastName?.trim() || !address.address1.trim() || !address.city.trim() || !address.country.trim()) return setError('Please complete the name, address, city, and country.');
    try {
      setLoading(true); clearNotice();
      const token = await requireToken();
      await saveShopifyCustomerAddress(token, address, editingAddressId);
      await loadCustomer(token);
      setShowAddressForm(false); setEditingAddressId(undefined); setAddress(emptyAddress);
      setMessage('Your address was saved.');
    } catch (reason) { setError(friendlyError(reason, 'Unable to save this address.')); }
    finally { setLoading(false); }
  };

  const makeDefault = async (id: string) => {
    try {
      setLoading(true); clearNotice();
      const token = await requireToken();
      await setDefaultShopifyCustomerAddress(token, id);
      await loadCustomer(token);
      setMessage('Your default address was updated.');
    } catch (reason) { setError(friendlyError(reason, 'Unable to update the default address.')); }
    finally { setLoading(false); }
  };

  const editAddress = (item: ShopifyCustomerAddress) => {
    setAddress({ firstName: item.firstName ?? '', lastName: item.lastName ?? '', address1: item.address1 ?? '', address2: item.address2 ?? '', city: item.city ?? '', province: item.province ?? '', country: item.country ?? 'Lebanon', zip: item.zip ?? '', phone: item.phone ?? '' });
    setEditingAddressId(item.id); setShowAddressForm(true); clearNotice();
  };

  const signOut = async () => { await SecureStore.deleteItemAsync(TOKEN_KEY); await SecureStore.deleteItemAsync(CUSTOMER_EMAIL_KEY); await SecureStore.deleteItemAsync(CUSTOMER_PHONE_KEY); setCustomer(null); setLoyalty(null); setLoyaltyError(''); setMode('signin'); clearNotice(); };
  const clearNotice = () => { setError(''); setMessage(''); };

  if (loading && !customer) return <View style={styles.center}><ActivityIndicator size="large" color="#002041" /></View>;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {customer ? <>
          <Text style={styles.title}>Hello, {customer.displayName}</Text>
          <Text style={styles.copy}>{customer.email}</Text>
          <View style={styles.tabs}>
            {(['profile', 'rewards', 'addresses', 'orders'] as const).map((item) => <TouchableOpacity key={item} style={[styles.tab, section === item && styles.tabActive]} onPress={() => { setSection(item); setSelectedOrder(null); clearNotice(); }}><Text style={[styles.tabText, section === item && styles.tabTextActive]}>{item[0].toUpperCase() + item.slice(1)}</Text></TouchableOpacity>)}
          </View>
          {section === 'profile' ? <ProfileForm {...{ firstName, setFirstName, lastName, setLastName, phone, setPhone, password, setPassword, confirmPassword, setConfirmPassword, saveProfile, loading }} /> : null}
          {section === 'rewards' ? <RewardsSection memberName={customer.displayName} loyalty={loyalty} loading={loyaltyLoading} error={loyaltyError} onRetry={()=>void requireToken().then(loadLoyalty).catch(reason=>setLoyaltyError(friendlyError(reason,'Please sign in again.')))} reward={loyaltyReward} redeemPoints={redeemPoints} setRedeemPoints={setRedeemPoints} redeeming={redeeming} combiningRewards={combiningRewards} onCombine={combineRewards} onRedeem={redeemReward}/> : null}
          {section === 'addresses' ? <View style={styles.section}>
            {customer.addresses.edges.length ? customer.addresses.edges.map(({ node }) => <View key={node.id} style={styles.card}>
              <View style={styles.cardTitleRow}><Text style={styles.cardTitle}>{node.firstName} {node.lastName}</Text>{customer.defaultAddress?.id === node.id ? <Text style={styles.badge}>DEFAULT</Text> : null}</View>
              <Text style={styles.cardCopy}>{node.formatted.join('\n')}</Text>
              <View style={styles.actionRow}><TouchableOpacity onPress={() => editAddress(node)}><Text style={styles.action}>Edit</Text></TouchableOpacity>{customer.defaultAddress?.id !== node.id ? <TouchableOpacity onPress={() => makeDefault(node.id)}><Text style={styles.action}>Make default</Text></TouchableOpacity> : null}</View>
            </View>) : <Text style={styles.empty}>You do not have a saved address yet.</Text>}
            {showAddressForm ? <AddressForm {...{ address, setAddress, saveAddress, loading }} /> : <TouchableOpacity style={styles.primaryButton} onPress={() => { setAddress(emptyAddress); setEditingAddressId(undefined); setShowAddressForm(true); }}><Text style={styles.primaryText}>Add an address</Text></TouchableOpacity>}
          </View> : null}
          {section === 'orders' ? <View style={styles.section}>
            {selectedOrder ? <OrderDetails order={selectedOrder} onBack={() => setSelectedOrder(null)} /> : customer.orders.edges.length ? customer.orders.edges.map(({ node }) => <TouchableOpacity key={node.id} style={styles.card} activeOpacity={0.7} onPress={() => setSelectedOrder(node)} accessibilityRole="button" accessibilityLabel={`View order ${node.name}`}>
              <View style={styles.cardTitleRow}><Text style={styles.cardTitle}>{node.name}</Text><View style={styles.orderHeading}><Text style={styles.orderPrice}>{formatMoney(node.currentTotalPrice)}</Text><Ionicons name="chevron-forward" size={18} color="#006eb8" /></View></View>
              <Text style={styles.cardCopy}>{new Date(node.processedAt).toLocaleDateString()} · {prettyStatus(node.fulfillmentStatus)}</Text>
              <Text style={styles.viewOrder}>View order details</Text>
            </TouchableOpacity>) : <Text style={styles.empty}>You have not placed an order yet.</Text>}
          </View> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}{message ? <Text style={styles.success}>{message}</Text> : null}
          <TouchableOpacity style={styles.secondaryButton} onPress={signOut}><Text style={styles.secondaryText}>Sign out</Text></TouchableOpacity>
        </> : <AuthForm {...{ mode, setMode, firstName, setFirstName, lastName, setLastName, email, setEmail, phone, setPhone, password, setPassword, error, message, loading, submit, clearNotice }} />}
        <Link href="/" dismissTo style={styles.link}>Continue shopping</Link>
      </ScrollView>
    </SafeAreaView>
  );
}

function RewardsSection({ memberName, loyalty, loading, error, onRetry, reward, redeemPoints, setRedeemPoints, redeeming, combiningRewards, onCombine, onRedeem }: { memberName: string; loyalty: LoyaltySummary | null; loading: boolean; error: string; onRetry: () => void; reward: LoyaltyReward | null; redeemPoints: string; setRedeemPoints: (value: string) => void; redeeming: boolean; combiningRewards:boolean; onCombine:()=>void; onRedeem: () => void }) {
  if (loading) return <View style={styles.section}><View style={styles.rewardsLoading}><ActivityIndicator color="#002041"/><Text style={styles.rewardsHint}>Loading your rewards account...</Text></View></View>;
  if (!loyalty) return <View style={styles.section}><View style={styles.rewardsError}><View style={styles.rewardsErrorIcon}><Ionicons name="cloud-offline-outline" size={26} color="#a06a21"/></View><Text style={styles.rewardsErrorTitle}>Rewards are temporarily unavailable</Text><Text style={styles.rewardsErrorCopy}>{error||'We could not connect to the rewards service.'}</Text><TouchableOpacity style={styles.primaryButton} onPress={onRetry}><Text style={styles.primaryText}>Try again</Text></TouchableOpacity></View></View>;
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
  return <View style={styles.section}>
    <View style={styles.rewardsCard}><View style={styles.rewardsCardGlow}/><View style={styles.rewardsCardMain}><View><View style={styles.rewardsMemberBadge}><Ionicons name="sparkles" size={11} color="#f3cf68"/><Text style={styles.rewardsMemberBadgeText}>REWARDS MEMBER</Text></View><Text style={styles.rewardsEyebrow}>{loyalty.programName}</Text><Text style={styles.rewardsPoints}>{loyalty.points.toLocaleString()}</Text><Text style={styles.rewardsLabel}>points available · up to {(loyalty.points/loyalty.pointsPerCurrencyUnit).toFixed(2)} {currency} value</Text></View><View style={styles.rewardsLifetime}><Ionicons name="star" size={30} color="#f3cf68"/><Text style={styles.rewardsLifetimeValue}>{loyalty.lifetimePoints.toLocaleString()}</Text><Text style={styles.rewardsLifetimeLabel}>lifetime earned</Text></View></View><View style={styles.rewardsCardFooter}><View><Text style={styles.rewardsCardMemberLabel}>MEMBER</Text><Text style={styles.rewardsCardMemberName} numberOfLines={1}>{memberName||'Carter’s Customer'}</Text></View><Text style={styles.rewardsCardFooterText}>CARTER&apos;S</Text></View></View>
    <View style={styles.rewardsBenefits}><View style={styles.rewardsBenefit}><Ionicons name="bag-check-outline" size={17} color="#006eb8"/><Text style={styles.rewardsBenefitText}>Earn on every item</Text></View><View style={styles.rewardsBenefit}><Ionicons name="shield-checkmark-outline" size={17} color="#006eb8"/><Text style={styles.rewardsBenefitText}>Secure redemption</Text></View><View style={styles.rewardsBenefit}><Ionicons name="key-outline" size={17} color="#006eb8"/><Text style={styles.rewardsBenefitText}>Private codes</Text></View></View>
    <View style={styles.rewardProgressCard}><View style={styles.rewardProgressHeader}><Text style={styles.rewardProgressTitle}>{remaining ? `${remaining} points to your first reward` : 'You have a reward ready'}</Text><Text style={styles.rewardProgressCount}>{Math.min(loyalty.points,minimum)}/{minimum}</Text></View><View style={styles.rewardProgressTrack}><View style={[styles.rewardProgressFill,{width:`${progress}%`}]}/></View><Text style={styles.rewardsHint}>{remaining ? 'Keep shopping to unlock your first checkout discount.' : `Redeem from ${minimum} points whenever you are ready.`}</Text></View>
    {reward?<View style={styles.rewardCodeCard}><View style={styles.rewardCodeTop}><View><Text style={styles.rewardCodeLabel}>NEW REWARD · READY TO USE</Text><Text style={styles.rewardCode}>{reward.code}</Text></View><Ionicons name="checkmark-circle" size={28} color="#19805c"/></View><Text style={styles.rewardCodeCopy}>{reward.amount.toFixed(2)} {reward.currencyCode} off · expires {new Date(reward.expiresAt).toLocaleDateString()}</Text><View style={styles.rewardUseSteps}><Text>1. Add products to your bag.</Text><Text>2. Tap Apply reward & checkout.</Text><Text>3. Your reward appears automatically in Shopify checkout.</Text></View></View>:null}
    {allActiveRewards.length?<><View style={styles.rewardSectionHead}><Text style={styles.sectionTitle}>Active rewards</Text><Text style={styles.rewardSectionCount}>{allActiveRewards.length} available</Text></View>{activeRewards.length?<View style={styles.activeRewardsList}>{activeRewards.map(transaction=><View style={styles.activeReward} key={transaction.id}><View style={styles.activeRewardIcon}><Ionicons name="ticket-outline" size={21} color="#12623f"/></View><View style={styles.rewardRowCopy}><Text style={styles.activeRewardCode}>{transaction.rewardCode}</Text><Text style={styles.activeRewardMeta}>{transaction.rewardAmount?.toFixed(2)||'Reward'} {transaction.currencyCode||currency} off · {transaction.expiresAt?`expires ${new Date(transaction.expiresAt).toLocaleDateString()}`:'ready to use'}</Text></View></View>)}</View>:null}{allActiveRewards.length>1?<View style={styles.combineRewardCard}><View style={styles.combineRewardCopy}><Text style={styles.combineRewardTitle}>Use all rewards together</Text><Text style={styles.combineRewardText}>Shopify cannot stack overlapping product rewards. Combine them into one checkout code with the full value.</Text></View><TouchableOpacity disabled={combiningRewards} style={styles.combineRewardButton} onPress={onCombine}><Text style={styles.combineRewardButtonText}>{combiningRewards?'Combining...':'Combine rewards'}</Text></TouchableOpacity></View>:null}</>:null}
    <Text style={styles.sectionTitle}>How rewards work</Text>
    <View style={styles.rewardHowCard}>{[
      ['bag-handle-outline','Shop signed in','Buy products using this same Shopify customer account.'],
      ['sparkles-outline','Earn automatically',`${loyalty.pointsPerItem} point${loyalty.pointsPerItem===1?'':'s'} for every product, added after payment is confirmed.`],
      ['pricetag-outline','Save at checkout','Redeem points here and your private code is applied automatically at checkout.'],
    ].map(([icon,title,copy],index)=><View style={styles.rewardHowRow} key={title}><View style={styles.rewardHowIcon}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={19} color="#006eb8"/></View><View style={styles.rewardHowCopy}><Text style={styles.rewardHowTitle}>{index+1}. {title}</Text><Text style={styles.rewardHowText}>{copy}</Text></View></View>)}</View>
    {loyalty.enabled ? <><Text style={styles.sectionTitle}>Redeem your points</Text><View style={styles.redeemCard}><View style={styles.redeemHeading}><View style={styles.rewardRowCopy}><Text style={styles.redeemTitle}>Choose a checkout reward</Text><Text style={styles.redeemCopy}>{loyalty.pointsPerCurrencyUnit} points = 1 {currency}</Text></View><Ionicons name="gift-outline" size={25} color="#006eb8"/></View><View style={styles.rewardChoices}>{choices.map(choice=><TouchableOpacity key={choice} disabled={loyalty.points<choice} style={[styles.rewardChoice,selectedPoints===choice&&styles.rewardChoiceSelected,loyalty.points<choice&&styles.rewardChoiceDisabled]} onPress={()=>setRedeemPoints(String(choice))}><Text style={[styles.rewardChoiceValue,selectedPoints===choice&&styles.rewardChoiceValueSelected]}>{(choice/loyalty.pointsPerCurrencyUnit).toFixed(0)} {currency}</Text><Text style={[styles.rewardChoicePoints,selectedPoints===choice&&styles.rewardChoiceValueSelected]}>{choice} points</Text></TouchableOpacity>)}</View><Text style={styles.redeemInputLabel}>Or enter a custom point amount</Text><TextInput style={styles.redeemInput} value={redeemPoints} onChangeText={setRedeemPoints} keyboardType="number-pad" placeholder={`${minimum} points or more`} placeholderTextColor="#8a96a1"/><View style={styles.redeemSummary}><Text>Reward value</Text><Text>{selectedValue.toFixed(2)} {currency}</Text></View><TouchableOpacity style={[styles.primaryButton,(redeeming||!canRedeem)&&styles.buttonDisabled]} disabled={redeeming||!canRedeem} onPress={onRedeem}><Text style={styles.primaryText}>{redeeming?'Creating secure reward...':'Create checkout reward'}</Text></TouchableOpacity>{remaining?<Text style={styles.redeemHelp}>You need {remaining} more points to unlock redemption.</Text>:!canRedeem?<Text style={styles.redeemHelp}>Choose at least {minimum} points, in blocks of {loyalty.pointsPerCurrencyUnit}, without exceeding your balance.</Text>:<Text style={styles.redeemHelp}>Your code is private, single-use, and valid for {loyalty.rewardExpiryDays} days.</Text>}</View></>:<View style={styles.rewardsPaused}><Ionicons name="pause-circle-outline" size={22} color="#8a6b22"/><Text>Reward redemption is temporarily paused. Your points remain safely in your account.</Text></View>}
    <Text style={styles.sectionTitle}>Points activity</Text>
    {loyalty.transactions.length ? loyalty.transactions.map(transaction=><View key={transaction.id} style={styles.rewardRow}><View style={styles.rewardRowCopy}><Text style={styles.rewardNote}>{transaction.note}</Text><Text style={styles.rewardDate}>{new Date(transaction.createdAt).toLocaleDateString()}</Text>{transaction.rewardCode?<View style={styles.rewardHistoryBox}><Text style={styles.rewardHistoryCode}>{transaction.rewardCode}</Text><Text style={styles.rewardHistoryMeta}>{transaction.expiresAt?`Expires ${new Date(transaction.expiresAt).toLocaleDateString()}`:'Checkout reward'}</Text></View>:null}</View><Text style={[styles.rewardValue,transaction.points<0&&styles.rewardValueNegative]}>{transaction.points>0?'+':''}{transaction.points}</Text></View>) : <Text style={styles.empty}>No reward activity yet. Your first paid order will start your balance.</Text>}
    <View style={styles.rewardTerms}><Ionicons name="information-circle-outline" size={18} color="#6b7a86"/><Text style={styles.rewardTermsText}>Points are added after payment confirmation. Cancelled or returned orders may reverse earned points. Reward codes cannot be exchanged for cash and may be subject to Shopify discount-combination rules.</Text></View>
  </View>;
}

function ProfileForm(props: any) { return <View style={styles.section}><Text style={styles.sectionTitle}>Personal details</Text><View style={styles.nameRow}><Field placeholder="First name" value={props.firstName} onChangeText={props.setFirstName} half /><Field placeholder="Last name" value={props.lastName} onChangeText={props.setLastName} half /></View><Field placeholder="Phone number" value={props.phone} onChangeText={props.setPhone} keyboardType="phone-pad" /><Text style={styles.sectionTitle}>Change password</Text><Text style={styles.hint}>Leave these fields empty to keep your current password.</Text><Field placeholder="New password" value={props.password} onChangeText={props.setPassword} secureTextEntry /><Field placeholder="Confirm new password" value={props.confirmPassword} onChangeText={props.setConfirmPassword} secureTextEntry /><PrimaryButton title="Save changes" onPress={props.saveProfile} loading={props.loading} /></View>; }

function AddressForm({ address, setAddress, saveAddress, loading }: any) { const change = (key: keyof ShopifyAddressInput) => (value: string) => setAddress((current: ShopifyAddressInput) => ({ ...current, [key]: value })); return <View style={styles.formBox}><Text style={styles.sectionTitle}>Address details</Text><View style={styles.nameRow}><Field placeholder="First name" value={address.firstName} onChangeText={change('firstName')} half /><Field placeholder="Last name" value={address.lastName} onChangeText={change('lastName')} half /></View><Field placeholder="Address" value={address.address1} onChangeText={change('address1')} /><Field placeholder="Apartment, suite, etc. (optional)" value={address.address2} onChangeText={change('address2')} /><Field placeholder="City" value={address.city} onChangeText={change('city')} /><Field placeholder="Province" value={address.province} onChangeText={change('province')} /><View style={styles.nameRow}><Field placeholder="Postal code" value={address.zip} onChangeText={change('zip')} half /><Field placeholder="Country" value={address.country} onChangeText={change('country')} half /></View><Field placeholder="Phone" value={address.phone} onChangeText={change('phone')} keyboardType="phone-pad" /><PrimaryButton title="Save address" onPress={saveAddress} loading={loading} /></View>; }

function OrderDetails({ order, onBack }: { order: ShopifyCustomerOrder; onBack: () => void }) {
  return <View>
    <TouchableOpacity style={styles.backButton} onPress={onBack}><Ionicons name="arrow-back" size={19} color="#006eb8" /><Text style={styles.action}>Back to orders</Text></TouchableOpacity>
    <Text style={styles.orderTitle}>Order {order.name}</Text>
    <Text style={styles.orderDate}>Placed on {new Date(order.processedAt).toLocaleDateString()}</Text>
    <View style={styles.statusRow}><View style={styles.statusBox}><Text style={styles.statusLabel}>Payment</Text><Text style={styles.statusValue}>{prettyStatus(order.financialStatus ?? 'pending')}</Text></View><View style={styles.statusBox}><Text style={styles.statusLabel}>Delivery</Text><Text style={styles.statusValue}>{prettyStatus(order.fulfillmentStatus)}</Text></View></View>
    <Text style={styles.sectionTitle}>Items</Text>
    {order.lineItems.edges.map(({ node }, index) => <View key={`${node.title}-${index}`} style={styles.orderLine}><View style={styles.quantityBubble}><Text style={styles.quantityText}>{node.quantity}</Text></View><View style={styles.orderLineText}><Text style={styles.orderItemTitle}>{node.title}</Text><Text style={styles.cardCopy}>Quantity: {node.quantity}</Text></View></View>)}
    <View style={styles.totalRow}><Text style={styles.totalLabel}>Order total</Text><Text style={styles.totalValue}>{formatMoney(order.currentTotalPrice)}</Text></View>
  </View>;
}

function AuthForm(props: any) { const title = props.mode === 'create' ? 'Create your account' : props.mode === 'recover' ? 'Reset your password' : 'Welcome back'; return <><Text style={styles.title}>{title}</Text><Text style={styles.copy}>Your account is saved securely with Carter&apos;s Shopify store.</Text>{props.mode !== 'recover' ? <View style={styles.tabs}><Tab title="Sign in" active={props.mode === 'signin'} onPress={() => { props.setMode('signin'); props.clearNotice(); }} /><Tab title="Create account" active={props.mode === 'create'} onPress={() => { props.setMode('create'); props.clearNotice(); }} /></View> : null}{props.mode === 'create' ? <View style={styles.nameRow}><Field placeholder="First name" value={props.firstName} onChangeText={props.setFirstName} half /><Field placeholder="Last name" value={props.lastName} onChangeText={props.setLastName} half /></View> : null}<Field placeholder="Email address" keyboardType="email-address" autoCapitalize="none" value={props.email} onChangeText={props.setEmail} />{props.mode === 'create' ? <Field placeholder="Phone number" keyboardType="phone-pad" value={props.phone} onChangeText={props.setPhone} /> : null}{props.mode !== 'recover' ? <Field placeholder="Password" secureTextEntry value={props.password} onChangeText={props.setPassword} /> : null}<TouchableOpacity style={styles.forgotButton} onPress={() => { props.setMode(props.mode === 'recover' ? 'signin' : 'recover'); props.clearNotice(); }}><Text style={styles.action}>{props.mode === 'recover' ? 'Back to sign in' : 'Forgot password?'}</Text></TouchableOpacity>{props.error ? <Text style={styles.error}>{props.error}</Text> : null}{props.message ? <Text style={styles.success}>{props.message}</Text> : null}<PrimaryButton title={props.mode === 'create' ? 'Create account' : props.mode === 'recover' ? 'Send reset link' : 'Sign in'} onPress={props.submit} loading={props.loading} /></>; }

function Field({ half, ...props }: any) { return <TextInput style={[styles.input, half && styles.half]} placeholderTextColor="#768195" {...props} />; }
function Tab({ title, active, onPress }: any) { return <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}><Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text></TouchableOpacity>; }
function PrimaryButton({ title, onPress, loading }: any) { return <TouchableOpacity style={styles.primaryButton} disabled={loading} onPress={onPress}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{title}</Text>}</TouchableOpacity>; }
async function requireToken() { const token = await SecureStore.getItemAsync(TOKEN_KEY); if (!token) throw new Error('Your session expired. Please sign in again.'); return token; }
function friendlyError(reason: unknown, fallback: string) { return reason instanceof Error && reason.message ? reason.message : fallback; }
function prettyStatus(value: string) { return value.toLowerCase().replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase()); }
function formatMoney(money: { amount: string; currencyCode: string }) { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: money.currencyCode }).format(Number(money.amount)); } catch { return `${money.amount} ${money.currencyCode}`; } }
function normalizeLebanesePhone(value: string) { const trimmed = value.trim(); const digits = trimmed.replace(/\D/g, ''); if (digits.length < 7) return ''; if (trimmed.startsWith('+')) return `+${digits}`; if (digits.startsWith('961')) return `+${digits}`; if (digits.startsWith('0')) return `+961${digits.slice(1)}`; return `+961${digits}`; }
async function syncNotificationIdentity(customer: ShopifyCustomer) {
  const token = await SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY);
  if (!token) return;
  try {
    await fetchAdmin('/api/push/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, customerEmail: customer.email, customerPhone: customer.phone }) });
  } catch { /* Admin API may be offline while browsing the app. */ }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }, container: { flexGrow: 1, alignItems: 'center', padding: 24, paddingBottom: 50 }, icon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf3f4', marginTop: 12, marginBottom: 14 },
  title: { color: '#002041', fontSize: 25, fontWeight: '900', textAlign: 'center' }, copy: { color: '#657083', textAlign: 'center', lineHeight: 21, marginTop: 7, marginBottom: 18 }, section: { width: '100%', maxWidth: 520 }, sectionTitle: { color: '#002041', fontSize: 18, fontWeight: '900', marginBottom: 10, marginTop: 7 }, hint: { color: '#657083', marginTop: -5, marginBottom: 12 },
  tabs: { width: '100%', maxWidth: 520, flexDirection: 'row', backgroundColor: '#f0f4f7', borderRadius: 9, padding: 4, marginBottom: 18 }, tab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, tabActive: { backgroundColor: '#fff' }, tabText: { color: '#718096', fontWeight: '700', fontSize: 13 }, tabTextActive: { color: '#002041', fontWeight: '900' },
  rewardsCard: { minHeight: 188, overflow: 'hidden', borderRadius: 18, backgroundColor: '#002041', padding: 21, marginBottom: 11 }, rewardsCardGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -65, top: -80, backgroundColor: '#0c527d' }, rewardsCardMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, rewardsCardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#27516d', marginTop: 17, paddingTop: 12 }, rewardsMemberBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, backgroundColor: '#254c67', paddingHorizontal: 8, paddingVertical: 5, marginBottom: 11 }, rewardsEyebrow: { color: '#9fc7e1', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, rewardsPoints: { color: '#fff', fontSize: 42, fontWeight: '900', marginTop: 8 }, rewardsLabel: { color: '#d5e4ee', fontSize: 10, fontWeight: '700', marginTop: 2 }, rewardsHint: { color: '#657083', fontSize: 12, lineHeight: 18, marginBottom: 18 }, rewardRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: '#e6eaee', paddingVertical: 11 }, rewardNote: { color: '#26384b', fontSize: 12, fontWeight: '800' }, rewardDate: { color: '#8995a0', fontSize: 10, marginTop: 4 }, rewardValue: { color: '#19805c', fontSize: 15, fontWeight: '900' }, rewardValueNegative: { color: '#b04a4a' },
  redeemCard: { borderWidth: 1, borderColor: '#c9dce9', borderRadius: 14, backgroundColor: '#f7fbfd', padding: 16, marginBottom: 18 }, redeemHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }, redeemTitle: { color: '#002041', fontSize: 16, fontWeight: '900' }, redeemCopy: { color: '#657083', fontSize: 11, lineHeight: 17, marginTop: 5 }, redeemInput: { height: 49, borderWidth: 1, borderColor: '#cbd7df', borderRadius: 8, backgroundColor: '#fff', color: '#17243a', paddingHorizontal: 13, marginBottom: 10 }, redeemHelp: { color: '#71808d', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 9 }, buttonDisabled: { opacity: 0.45 }, rewardCodeCard: { borderWidth: 1, borderColor: '#a9d5bd', borderRadius: 14, backgroundColor: '#eef9f3', padding: 17, marginBottom: 18 }, rewardCodeLabel: { color: '#39805e', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, rewardCode: { color: '#12623f', fontSize: 23, fontWeight: '900', letterSpacing: 1.2, marginTop: 7 }, rewardCodeCopy: { color: '#597166', fontSize: 11, marginTop: 6 }, rewardRowCopy: { flex: 1 }, rewardHistoryCode: { color: '#006eb8', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginTop: 4 },
  rewardsLoading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 }, rewardsError: { minHeight: 250, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ead7b5', borderRadius: 14, backgroundColor: '#fffaf1', padding: 22 }, rewardsErrorIcon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: '#f7ead1', marginBottom: 12 }, rewardsErrorTitle: { color: '#3c4650', fontSize: 17, fontWeight: '900', textAlign: 'center' }, rewardsErrorCopy: { color: '#746b5d', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7, marginBottom: 16 }, rewardsLifetime: { alignItems: 'center' }, rewardsLifetimeValue: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 5 }, rewardsLifetimeLabel: { color: '#9fc7e1', fontSize: 9, fontWeight: '700', marginTop: 2 }, rewardProgressCard: { borderWidth: 1, borderColor: '#dde5eb', borderRadius: 12, padding: 15, marginBottom: 20 }, rewardProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, rewardProgressTitle: { flex: 1, color: '#002041', fontSize: 13, fontWeight: '900' }, rewardProgressCount: { color: '#006eb8', fontSize: 12, fontWeight: '900' }, rewardProgressTrack: { height: 8, borderRadius: 4, backgroundColor: '#e8edf1', overflow: 'hidden', marginVertical: 12 }, rewardProgressFill: { height: '100%', borderRadius: 4, backgroundColor: '#f0bd35' }, rewardHowCard: { borderWidth: 1, borderColor: '#e0e6eb', borderRadius: 13, paddingHorizontal: 15, marginBottom: 20 }, rewardHowRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#edf0f2', paddingVertical: 14 }, rewardHowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf4fa' }, rewardHowCopy: { flex: 1 }, rewardHowTitle: { color: '#20384b', fontSize: 13, fontWeight: '900' }, rewardHowText: { color: '#71808c', fontSize: 11, lineHeight: 17, marginTop: 3 }, rewardChoices: { flexDirection: 'row', gap: 8, marginBottom: 14 }, rewardChoice: { flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cdd8df', borderRadius: 9, backgroundColor: '#fff' }, rewardChoiceSelected: { borderColor: '#006eb8', backgroundColor: '#006eb8' }, rewardChoiceDisabled: { opacity: 0.35 }, rewardChoiceValue: { color: '#002041', fontSize: 19, fontWeight: '900' }, rewardChoiceValueSelected: { color: '#fff' }, rewardChoicePoints: { color: '#74818c', fontSize: 9, fontWeight: '800', marginTop: 3 }, redeemInputLabel: { color: '#42596a', fontSize: 11, fontWeight: '800', marginBottom: 6 }, redeemSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 13 }, rewardCodeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, rewardUseSteps: { borderTopWidth: 1, borderTopColor: '#c9e3d5', gap: 7, marginTop: 13, paddingTop: 12 }, rewardHistoryBox: { alignSelf: 'flex-start', borderRadius: 6, backgroundColor: '#edf5fa', paddingHorizontal: 8, paddingVertical: 5, marginTop: 6 }, rewardHistoryMeta: { color: '#6d7c87', fontSize: 9, marginTop: 2 }, rewardsPaused: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#ead49f', borderRadius: 11, backgroundColor: '#fff9eb', padding: 14, marginBottom: 18 },
  rewardsMemberBadgeText: { color: '#f8e6a4', fontSize: 8, fontWeight: '900', letterSpacing: .7 }, rewardsCardFooterText: { alignSelf: 'flex-end', color: '#8fb2c8', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, rewardsCardMemberLabel: { color: '#7199b3', fontSize: 7, fontWeight: '900', letterSpacing: 1 }, rewardsCardMemberName: { maxWidth: 220, color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: .3, marginTop: 3 }, rewardsBenefits: { flexDirection: 'row', borderWidth: 1, borderColor: '#e1e7eb', borderRadius: 12, backgroundColor: '#fafcfd', paddingVertical: 12, marginBottom: 14 }, rewardsBenefit: { flex: 1, alignItems: 'center', gap: 5, paddingHorizontal: 5 }, rewardsBenefitText: { color: '#536776', fontSize: 8, fontWeight: '800', textAlign: 'center' }, rewardSectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, rewardSectionCount: { color: '#19805c', fontSize: 9, fontWeight: '900' }, activeRewardsList: { gap: 8 }, activeReward: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: '#b8dbc8', borderRadius: 11, backgroundColor: '#f2faf5', padding: 12 }, activeRewardIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#dcefe4' }, activeRewardCode: { color: '#12623f', fontSize: 14, fontWeight: '900', letterSpacing: .6 }, activeRewardMeta: { color: '#658073', fontSize: 10, marginTop: 4 }, combineRewardCard: { borderWidth: 1, borderColor: '#c7dbea', borderRadius: 12, backgroundColor: '#f4f9fc', padding: 14, marginTop: 10, marginBottom: 18 }, combineRewardCopy: { marginBottom: 11 }, combineRewardTitle: { color: '#173a53', fontSize: 13, fontWeight: '900' }, combineRewardText: { color: '#687b89', fontSize: 10, lineHeight: 15, marginTop: 4 }, combineRewardButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#006eb8' }, combineRewardButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' }, rewardTerms: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 10, backgroundColor: '#f1f4f6', padding: 13, marginTop: 17 }, rewardTermsText: { flex: 1, color: '#6b7a86', fontSize: 9, lineHeight: 14 },
  nameRow: { width: '100%', flexDirection: 'row', gap: 10 }, input: { width: '100%', height: 52, borderWidth: 1, borderColor: '#d7dfe7', borderRadius: 7, paddingHorizontal: 14, marginBottom: 11, color: '#17243a', backgroundColor: '#fff' }, half: { flex: 1 },
  primaryButton: { width: '100%', minHeight: 52, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#002041', paddingHorizontal: 16 }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' }, secondaryButton: { width: '100%', maxWidth: 520, height: 50, borderWidth: 1, borderColor: '#002041', borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, secondaryText: { color: '#002041', fontWeight: '800' },
  error: { width: '100%', maxWidth: 520, color: '#c5524a', lineHeight: 19, marginVertical: 12 }, success: { width: '100%', maxWidth: 520, color: '#287a54', lineHeight: 20, marginVertical: 12, textAlign: 'center' }, forgotButton: { width: '100%', alignItems: 'flex-end', paddingVertical: 5, marginTop: -5, marginBottom: 8 }, link: { color: '#002041', fontWeight: '700', marginTop: 18, padding: 10 },
  card: { borderWidth: 1, borderColor: '#dfe6ec', borderRadius: 10, padding: 15, marginBottom: 12 }, cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, cardTitle: { flex: 1, color: '#002041', fontSize: 16, fontWeight: '900' }, cardCopy: { color: '#657083', lineHeight: 21, marginTop: 7 }, badge: { color: '#287a54', backgroundColor: '#e8f6ee', fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }, actionRow: { flexDirection: 'row', gap: 22, marginTop: 12 }, action: { color: '#006eb8', fontWeight: '800' }, orderPrice: { color: '#002041', fontWeight: '900' }, orderHeading: { flexDirection: 'row', alignItems: 'center', gap: 5 }, viewOrder: { color: '#006eb8', fontWeight: '800', marginTop: 12 }, empty: { color: '#657083', textAlign: 'center', marginVertical: 25 }, formBox: { backgroundColor: '#f7f9fa', borderRadius: 10, padding: 14, marginTop: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 10 }, orderTitle: { color: '#002041', fontSize: 24, fontWeight: '900' }, orderDate: { color: '#657083', marginTop: 5, marginBottom: 18 }, statusRow: { flexDirection: 'row', gap: 10, marginBottom: 20 }, statusBox: { flex: 1, backgroundColor: '#f0f5f7', borderRadius: 9, padding: 12 }, statusLabel: { color: '#657083', fontSize: 12, fontWeight: '700', marginBottom: 4 }, statusValue: { color: '#002041', fontWeight: '900' }, orderLine: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e9ed', paddingVertical: 13 }, quantityBubble: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eaf3f4', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, quantityText: { color: '#002041', fontWeight: '900' }, orderLineText: { flex: 1 }, orderItemTitle: { color: '#17243a', fontWeight: '800' }, totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: '#002041', paddingTop: 15, marginTop: 20 }, totalLabel: { color: '#002041', fontSize: 17, fontWeight: '900' }, totalValue: { color: '#002041', fontSize: 19, fontWeight: '900' },
});
