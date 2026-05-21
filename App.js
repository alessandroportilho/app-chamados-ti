import React, { useState, createContext, useContext, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

// ============================================================
// 🔥 CONFIGURAÇÃO E INTEGRAÇÃO COM O FIREBASE
// ============================================================
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  onSnapshot // ⚡ Importado o escutador em tempo real do Firestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBP7cxxB1c3Yl1Ew9PZufgu8rJZFFE-9fE",
  authDomain: "projeto-android-react.firebaseapp.com",
  projectId: "projeto-android-react",
  storageBucket: "projeto-android-react.firebasestorage.app",
  messagingSenderId: "392670608526",
  appId: "1:392670608526:web:14ba61dba2dd59abb59ddf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// 💾 CAMADA DE SERVIÇO (ESCRITA NO FIRESTORE)
// ============================================================
const chamadosService = {
  inserir: async (novoChamado) => {
    try {
      const chamadoComData = {
        ...novoChamado,
        dataCriacao: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, "chamados"), chamadoComData);
      return { id: docRef.id, ...chamadoComData };
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  atualizarStatus: async (id, novoStatus) => {
    try {
      const chamadoRef = doc(db, "chamados", id);
      await updateDoc(chamadoRef, { status: novoStatus });
      return { id, status: novoStatus };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
};

// ============================================================
// 🧠 CONTEXTO GLOBAL (ESTADO EM TEMPO REAL + AUTENTICAÇÃO)
// ============================================================
const ChamadosContext = createContext();

function ChamadosProvider({ children }) {
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  // ⚡ Lógica de escuta ativa (Realtime Stream)
  useEffect(() => {
    let unsubscribe;

    if (usuarioLogado) {
      setCarregando(true);
      const q = query(collection(db, "chamados"), orderBy("dataCriacao", "desc"));

      // O onSnapshot cria um canal aberto com o Firebase
      unsubscribe = onSnapshot(q, (querySnapshot) => {
        const listaChamados = [];
        querySnapshot.forEach((documento) => {
          listaChamados.push({
            id: documento.id,
            ...documento.data()
          });
        });
        setChamados(listaChamados);
        setCarregando(false);
      }, (error) => {
        console.error("Erro na escuta realtime: ", error);
        Alert.alert("Erro de Sincronização", "Falha ao receber atualizações da nuvem.");
        setCarregando(false);
      });
    }

    // 🔥 Limpeza de memória: desliga o escutador se o usuário deslogar
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [usuarioLogado]);

  const addChamado = async (novo) => {
    try {
      await chamadosService.inserir(novo);
      // Não precisa recarregar manualmente! O onSnapshot detecta a inserção sozinho.
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar o chamado.");
    }
  };

  const mudarStatusChamado = async (id, novoStatus) => {
    try {
      await chamadosService.atualizarStatus(id, novoStatus);
      // Não precisa recarregar manualmente! O onSnapshot detecta a mudança sozinho.
    } catch (error) {
      Alert.alert("Erro", "Não foi possível alterar o status.");
    }
  };

  const atualizarFotoPerfil = (uri) => {
    setUsuarioLogado(prev => prev ? { ...prev, fotoPerfil: uri } : null);
  };

  const realizarLogin = (email, senha) => {
    if (email === "aleportilho25@gmail.com" && senha === "123456@") {
      setUsuarioLogado({ email, nome: "Alessandro Portilho", role: "usuario", departamento: "Engenharia de Produção", fotoPerfil: null });
      return true;
    } else if (email === "aleportilhoti@gmail.com" && senha === "12345678@") {
      setUsuarioLogado({ email, nome: "Alessandro Corazza", role: "tecnico", departamento: "Infraestrutura de TI", fotoPerfil: null });
      return true;
    }
    return false;
  };

  const realizarLogout = () => {
    setUsuarioLogado(null);
    setChamados([]); // Limpa a lista ao sair por segurança
  };

  return (
    <ChamadosContext.Provider 
      value={{ 
        chamados, 
        carregando, 
        usuarioLogado, 
        addChamado, 
        mudarStatusChamado, 
        realizarLogin, 
        realizarLogout,
        atualizarFotoPerfil
      }}
    >
      {children}
    </ChamadosContext.Provider>
  );
}

const useChamados = () => useContext(ChamadosContext);

// ============================================================
// 🔐 TELA DE LOGIN
// ============================================================
function LoginScreen() {
  const { realizarLogin } = useChamados();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleLogin = () => {
    const sucesso = realizarLogin(email.trim().toLowerCase(), senha);
    if (!sucesso) {
      Alert.alert("Falha no Login", "E-mail ou senha inválidos para o ambiente acadêmico.");
    }
  };

  return (
    <SafeAreaView style={loginStyles.container}>
      <View style={loginStyles.box}>
        <Ionicons name="shield-checkmark" size={50} color="#2d5be3" style={{ alignSelf: "center", marginBottom: 10 }} />
        <Text style={loginStyles.logo}>HelpDesk TI</Text>
        <Text style={loginStyles.welcome}>Controle de Acesso Corporativo</Text>

        <TextInput 
          placeholder="E-mail corporativo" 
          style={loginStyles.input} 
          value={email} 
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput 
          placeholder="Senha" 
          style={loginStyles.input} 
          secureTextEntry 
          value={senha} 
          onChangeText={setSenha}
        />

        <TouchableOpacity style={loginStyles.btn} onPress={handleLogin}>
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Acessar Painel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// 🏠 HOME SCREEN (VISÕES SEPARADAS RESPONSIVAS)
// ============================================================
const { width } = Dimensions.get("window");

function HomeScreen({ navigation }) {
  const { chamados, carregando, usuarioLogado, mudarStatusChamado } = useChamados();
  const [filtro, setFiltro] = useState("Todos");

  const filtrar = () => {
    return chamados.filter((c) => filtro === "Todos" || c.status === filtro);
  };

  const contar = (status) => chamados.filter((c) => c.status === status).length;

  if (carregando) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2d5be3" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
          <View>
            <Text style={styles.title}>Olá, {usuarioLogado?.nome.split(' ')[0]}</Text>
            <Text style={styles.subtitle}>Painel: {usuarioLogado?.role === "tecnico" ? "Técnico Especialista" : "Colaborador"}</Text>
          </View>
          <Ionicons name={usuarioLogado?.role === "tecnico" ? "build" : "person-circle"} size={36} color="#fff" />
        </View>

        <View style={styles.cardsRow}>
          <View style={styles.infoCard}><Text style={styles.cardNum}>{contar("Aberto")}</Text><Text style={styles.cardLab}>Abertos</Text></View>
          <View style={styles.infoCard}><Text style={styles.cardNum}>{contar("Em Progresso")}</Text><Text style={styles.cardLab}>Em Curso</Text></View>
          <View style={styles.infoCard}><Text style={styles.cardNum}>{contar("Resolvido")}</Text><Text style={styles.cardLab}>Fechados</Text></View>
        </View>
      </View>

      <View style={styles.filtros}>
        {["Todos", "Aberto", "Em Progresso", "Resolvido"].map((f) => (
          <TouchableOpacity 
            key={f} 
            style={[styles.filtroBtn, filtro === f && styles.filtroAtivo]} 
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.filtroTexto, filtro === f && { color: "#fff", fontWeight: "bold" }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtrar()}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.cardTitulo} numberOfLines={2}>
                  {item.titulo}
                </Text>
              </View>
              
              <View style={[styles.statusTag, { 
                backgroundColor: item.status === "Resolvido" ? "#e2fbe8" : item.status === "Em Progresso" ? "#fff3cd" : "#fdecea"
              }]}>
                <Text style={[styles.statusTexto, { 
                  color: item.status === "Resolvido" ? "#1e7e34" : item.status === "Em Progresso" ? "#856404" : "#bd2130"
                }]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <Text style={styles.cardDescricao}>{item.descricao}</Text>
            
            <View style={styles.cardSubFooter}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="person-outline" size={12} color="#888" style={{ marginRight: 4 }} />
                <Text style={styles.cardMetaText}>Solicitante: {item.nome || "Anônimo"}</Text>
              </View>
            </View>

            {usuarioLogado?.role === "tecnico" && (
              <View style={styles.adminActions}>
                {item.status !== "Em Progresso" && item.status !== "Resolvido" && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#ffc107" }]} onPress={() => mudarStatusChamado(item.id, "Em Progresso")}>
                    <Ionicons name="play" size={14} color="#000" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, fontWeight: "bold", color: "#000" }}>Atender</Text>
                  </TouchableOpacity>
                )}
                {item.status !== "Resolvido" && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#28a745" }]} onPress={() => mudarStatusChamado(item.id, "Resolvido")}>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: "#fff", fontWeight: "bold" }}>Fechar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      />

      {usuarioLogado?.role === "usuario" && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("NovoChamado")}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ============================================================
// 📝 NOVO CHAMADO SCREEN
// ============================================================
function NovoChamadoScreen({ navigation }) {
  const { addChamado, usuarioLogado } = useChamados();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  const criar = async () => {
    if (!titulo || !descricao) return;
    await addChamado({
      titulo,
      descricao,
      categoria: "Infraestrutura",
      prioridade: "Alta",
      nome: usuarioLogado.nome,
      status: "Aberto"
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: "#f8f9fa" }}>
      <Text style={styles.formLabel}>Título do Problema</Text>
      <TextInput 
        placeholder="Ex: Wi-Fi caindo na sala 03" 
        style={styles.formInput} 
        value={titulo} 
        onChangeText={setTitulo} 
      />
      
      <Text style={[styles.formLabel, { marginTop: 15 }]}>Descrição Detalhada</Text>
      <TextInput 
        placeholder="Descreva o mau funcionamento com detalhes para a equipe técnica..." 
        style={[styles.formInput, { height: 120, textAlignVertical: "top" }]} 
        multiline 
        value={descricao} 
        onChangeText={setDescricao} 
      />
      
      <TouchableOpacity style={styles.formBotao} onPress={criar}>
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Enviar para a TI</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ============================================================
// 👤 PERFIL SCREEN (FOTO NATIVA + CAMPOS AVANÇADOS)
// ============================================================
function PerfilScreen() {
  const { usuarioLogado, realizarLogout, atualizarFotoPerfil } = useChamados();

  const gerenciarFoto = async () => {
    Alert.alert(
      "Alterar Foto de Perfil",
      "Escolha de onde deseja carregar a sua imagem:",
      [
        {
          text: "Tirar Foto (Câmera)",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              Alert.alert("Erro", "Permissão de câmera negada.");
              return;
            }
            let result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
            });
            if (!result.canceled) atualizarFotoPerfil(result.assets[0].uri);
          }
        },
        {
          text: "Escolher da Galeria",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
              Alert.alert("Erro", "Permissão de galeria negada.");
              return;
            }
            let result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
            });
            if (!result.canceled) atualizarFotoPerfil(result.assets[0].uri);
          }
        },
        { text: "Cancelar", style: "cancel" }
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f4f6f9" }}>
      <SafeAreaView>
        <View style={perfilStyles.container}>
          
          <View style={perfilStyles.avatarWrapper}>
            <TouchableOpacity style={perfilStyles.avatarTouch} onPress={gerenciarFoto}>
              {usuarioLogado?.fotoPerfil ? (
                <Image source={{ uri: usuarioLogado.fotoPerfil }} style={perfilStyles.imageAvatar} />
              ) : (
                <View style={perfilStyles.placeholderAvatar}>
                  <Text style={perfilStyles.avatarLetra}>{usuarioLogado?.nome.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={perfilStyles.cameraIconBox}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={perfilStyles.userName}>{usuarioLogado?.nome}</Text>
          <Text style={perfilStyles.userSub}>{usuarioLogado?.role === "tecnico" ? "Equipe de Suporte Avançado" : "Usuário Corporativo"}</Text>

          <View style={perfilStyles.infoBox}>
            <View style={perfilStyles.infoRow}>
              <Ionicons name="mail" size={20} color="#4b6cb7" style={{ marginRight: 12 }} />
              <View>
                <Text style={perfilStyles.infoLabel}>E-mail Registrado</Text>
                <Text style={perfilStyles.infoValue}>{usuarioLogado?.email}</Text>
              </View>
            </View>

            <View style={perfilStyles.divider} />

            <View style={perfilStyles.infoRow}>
              <Ionicons name="business" size={20} color="#4b6cb7" style={{ marginRight: 12 }} />
              <View>
                <Text style={perfilStyles.infoLabel}>Departamento</Text>
                <Text style={perfilStyles.infoValue}>{usuarioLogado?.departamento}</Text>
              </View>
            </View>

            <View style={perfilStyles.divider} />

            <View style={perfilStyles.infoRow}>
              <Ionicons name="ribbon" size={20} color="#4b6cb7" style={{ marginRight: 12 }} />
              <View>
                <Text style={perfilStyles.infoLabel}>Nível de Privilégio</Text>
                <Text style={[perfilStyles.infoValue, { fontWeight: "bold", color: "#2d5be3" }]}>
                  {usuarioLogado?.role.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={perfilStyles.logoutBtn} onPress={realizarLogout}>
            <Ionicons name="log-out" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Encerrar Sessão</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

// ============================================================
// 🧭 NAVEGAÇÃO TURBINADA COM ÍCONES NAS ABAS
// ============================================================
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#2d5be3",
        tabBarInactiveTintColor: "#8e8e93",
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6, backgroundColor: "#fff" },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Painel") {
            iconName = focused ? "list-circle" : "list-circle-outline";
          } else if (route.name === "Minha Conta") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size + 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Painel" component={HomeScreen} />
      <Tab.Screen name="Minha Conta" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { usuarioLogado } = useChamados();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {usuarioLogado == null ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={Tabs} />
          <Stack.Screen name="NovoChamado" component={NovoChamadoScreen} options={{ headerShown: true, title: "Abertura de Chamado", headerTintColor: "#2d5be3" }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ChamadosProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </ChamadosProvider>
  );
}

// ============================================================
// 🎨 FOLHAS DE ESTILO (DESIGN PREMIUM)
// ============================================================
const loginStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2d5be3", justifyContent: "center", alignItems: "center" },
  box: { backgroundColor: "#fff", width: "85%", padding: 30, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 8 },
  logo: { fontSize: 28, fontWeight: "bold", color: "#1a1a1a", textAlign: "center" },
  welcome: { fontSize: 13, color: "#666", textAlign: "center", marginBottom: 25, marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", padding: 14, borderRadius: 10, marginBottom: 14, backgroundColor: "#f8fafc", fontSize: 16 },
  btn: { backgroundColor: "#2d5be3", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 10 }
});

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  header: { backgroundColor: "#2d5be3", padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  subtitle: { color: "#cbd5e1", fontSize: 13, marginTop: 2 },
  cardsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  infoCard: { backgroundColor: "rgba(255,255,255,0.15)", padding: 12, borderRadius: 12, width: width / 3.4, alignItems: "center" },
  cardNum: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  cardLab: { color: "#e2e8f0", fontSize: 11, marginTop: 2 },
  filtros: { flexDirection: "row", justifyContent: "space-around", padding: 12, backgroundColor: "#fff", marginVertical: 10, marginHorizontal: 10, borderRadius: 12, elevation: 1 },
  filtroBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "#f1f5f9", borderRadius: 20 },
  filtroAtivo: { backgroundColor: "#2d5be3" },
  filtroTexto: { color: "#475569", fontSize: 13 },
  card: { backgroundColor: "#fff", marginHorizontal: 12, marginBottom: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#f1f5f9", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  cardTitulo: { fontWeight: "bold", fontSize: 16, color: "#1e293b", lineHeight: 22 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 90, alignItems: "center" },
  statusTexto: { fontSize: 12, fontWeight: "bold" },
  cardDescricao: { color: "#64748b", marginVertical: 10, fontSize: 14, lineHeight: 20 },
  cardSubFooter: { borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 10, marginTop: 5 },
  cardMetaText: { fontSize: 12, color: "#94a3b8" },
  adminActions: { flexDirection: "row", marginTop: 12, justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 12 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 14, marginLeft: 10, borderRadius: 8, flexDirection: "row", alignItems: "center" },
  fab: { position: "absolute", right: 20, bottom: 20, backgroundColor: "#2d5be3", width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", elevation: 6 },
  formLabel: { fontWeight: "bold", color: "#1e293b", fontSize: 15 },
  formInput: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 14, marginTop: 6, backgroundColor: "#fff", fontSize: 16 },
  formBotao: { backgroundColor: "#2d5be3", padding: 16, marginTop: 25, borderRadius: 10, alignItems: "center" }
});

const perfilStyles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: "center" },
  avatarWrapper: { marginTop: 20, marginBottom: 15 },
  avatarTouch: { position: "relative" },
  placeholderAvatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#2d5be3", justifyContent: "center", alignItems: "center", elevation: 3 },
  imageAvatar: { width: 110, height: 110, borderRadius: 55, elevation: 3 },
  avatarLetra: { fontSize: 44, fontWeight: "bold", color: "#fff" },
  cameraIconBox: { position: "absolute", bottom: 2, right: 2, backgroundColor: "#1e293b", width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  userName: { fontSize: 22, fontWeight: "bold", color: "#1e293b" },
  userSub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  infoBox: { backgroundColor: "#fff", width: "100%", borderRadius: 16, padding: 16, marginTop: 25, borderWidth: 1, borderColor: "#e2e8f0", elevation: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  infoLabel: { fontSize: 12, color: "#94a3b8" },
  infoValue: { fontSize: 15, color: "#334155", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 8 },
  logoutBtn: { backgroundColor: "#dc3545", flexDirection: "row", width: "100%", padding: 16, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 30, elevation: 2 }
});