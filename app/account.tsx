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
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const TOKEN_KEY = 'shopify_customer_access_token';
const emptyAddress: ShopifyAddressInput = { firstName: '', lastName: '', address1: '', address2: '', city: '', province: '', country: 'Lebanon', zip: '', phone: '' };

export default function AccountScreen() {
  const [mode, setMode] = useState<'signin' | 'create' | 'recover'>('signin');
  const [section, setSection] = useState<'profile' | 'addresses' | 'orders'>('profile');
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

  useEffect(() => { void loadCustomer(); }, []);

  const loadCustomer = async (providedToken?: string) => {
    try {
      const token = providedToken ?? await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) { setCustomer(null); return; }
      const profile = await getShopifyCustomer(token);
      if (!profile) await SecureStore.deleteItemAsync(TOKEN_KEY);
      setCustomer(profile);
      if (profile) {
        setFirstName(profile.firstName ?? '');
        setLastName(profile.lastName ?? '');
        setPhone(profile.phone ?? '');
      }
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
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

  const signOut = async () => { await SecureStore.deleteItemAsync(TOKEN_KEY); setCustomer(null); setMode('signin'); clearNotice(); };
  const clearNotice = () => { setError(''); setMessage(''); };

  if (loading && !customer) return <View style={styles.center}><ActivityIndicator size="large" color="#002041" /></View>;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.icon}><Ionicons name="person-outline" size={32} color="#002041" /></View>
        {customer ? <>
          <Text style={styles.title}>Hello, {customer.displayName}</Text>
          <Text style={styles.copy}>{customer.email}</Text>
          <View style={styles.tabs}>
            {(['profile', 'addresses', 'orders'] as const).map((item) => <TouchableOpacity key={item} style={[styles.tab, section === item && styles.tabActive]} onPress={() => { setSection(item); setSelectedOrder(null); clearNotice(); }}><Text style={[styles.tabText, section === item && styles.tabTextActive]}>{item[0].toUpperCase() + item.slice(1)}</Text></TouchableOpacity>)}
          </View>
          {section === 'profile' ? <ProfileForm {...{ firstName, setFirstName, lastName, setLastName, phone, setPhone, password, setPassword, confirmPassword, setConfirmPassword, saveProfile, loading }} /> : null}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }, container: { flexGrow: 1, alignItems: 'center', padding: 24, paddingBottom: 50 }, icon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf3f4', marginTop: 12, marginBottom: 14 },
  title: { color: '#002041', fontSize: 25, fontWeight: '900', textAlign: 'center' }, copy: { color: '#657083', textAlign: 'center', lineHeight: 21, marginTop: 7, marginBottom: 18 }, section: { width: '100%', maxWidth: 520 }, sectionTitle: { color: '#002041', fontSize: 18, fontWeight: '900', marginBottom: 10, marginTop: 7 }, hint: { color: '#657083', marginTop: -5, marginBottom: 12 },
  tabs: { width: '100%', maxWidth: 520, flexDirection: 'row', backgroundColor: '#f0f4f7', borderRadius: 9, padding: 4, marginBottom: 18 }, tab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 7 }, tabActive: { backgroundColor: '#fff' }, tabText: { color: '#718096', fontWeight: '700', fontSize: 13 }, tabTextActive: { color: '#002041', fontWeight: '900' },
  nameRow: { width: '100%', flexDirection: 'row', gap: 10 }, input: { width: '100%', height: 52, borderWidth: 1, borderColor: '#d7dfe7', borderRadius: 7, paddingHorizontal: 14, marginBottom: 11, color: '#17243a', backgroundColor: '#fff' }, half: { flex: 1 },
  primaryButton: { width: '100%', minHeight: 52, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#002041', paddingHorizontal: 16 }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' }, secondaryButton: { width: '100%', maxWidth: 520, height: 50, borderWidth: 1, borderColor: '#002041', borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, secondaryText: { color: '#002041', fontWeight: '800' },
  error: { width: '100%', maxWidth: 520, color: '#c5524a', lineHeight: 19, marginVertical: 12 }, success: { width: '100%', maxWidth: 520, color: '#287a54', lineHeight: 20, marginVertical: 12, textAlign: 'center' }, forgotButton: { width: '100%', alignItems: 'flex-end', paddingVertical: 5, marginTop: -5, marginBottom: 8 }, link: { color: '#002041', fontWeight: '700', marginTop: 18, padding: 10 },
  card: { borderWidth: 1, borderColor: '#dfe6ec', borderRadius: 10, padding: 15, marginBottom: 12 }, cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, cardTitle: { flex: 1, color: '#002041', fontSize: 16, fontWeight: '900' }, cardCopy: { color: '#657083', lineHeight: 21, marginTop: 7 }, badge: { color: '#287a54', backgroundColor: '#e8f6ee', fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }, actionRow: { flexDirection: 'row', gap: 22, marginTop: 12 }, action: { color: '#006eb8', fontWeight: '800' }, orderPrice: { color: '#002041', fontWeight: '900' }, orderHeading: { flexDirection: 'row', alignItems: 'center', gap: 5 }, viewOrder: { color: '#006eb8', fontWeight: '800', marginTop: 12 }, empty: { color: '#657083', textAlign: 'center', marginVertical: 25 }, formBox: { backgroundColor: '#f7f9fa', borderRadius: 10, padding: 14, marginTop: 4 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 10 }, orderTitle: { color: '#002041', fontSize: 24, fontWeight: '900' }, orderDate: { color: '#657083', marginTop: 5, marginBottom: 18 }, statusRow: { flexDirection: 'row', gap: 10, marginBottom: 20 }, statusBox: { flex: 1, backgroundColor: '#f0f5f7', borderRadius: 9, padding: 12 }, statusLabel: { color: '#657083', fontSize: 12, fontWeight: '700', marginBottom: 4 }, statusValue: { color: '#002041', fontWeight: '900' }, orderLine: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e9ed', paddingVertical: 13 }, quantityBubble: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eaf3f4', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, quantityText: { color: '#002041', fontWeight: '900' }, orderLineText: { flex: 1 }, orderItemTitle: { color: '#17243a', fontWeight: '800' }, totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: '#002041', paddingTop: 15, marginTop: 20 }, totalLabel: { color: '#002041', fontSize: 17, fontWeight: '900' }, totalValue: { color: '#002041', fontSize: 19, fontWeight: '900' },
});
