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
} from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

// ============================================================
// 🔥 CONFIGURAÇÃO E INTEGRAÇÃO COM O FIREBASE
// ============================================================
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy 
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
// 💾 CAMADA DE SERVIÇO (FIRESTORE)
// ============================================================
const chamadosService = {
  buscarTodos: async () => {
    try {
      const q = query(collection(db, "chamados"), orderBy("dataCriacao", "desc"));
      const querySnapshot = await getDocs(q);
      
      const listaChamados = [];
      querySnapshot.forEach((documento) => {
        listaChamados.push({
          id: documento.id,
          ...documento.data()
        });
      });
      return listaChamados;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

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
// 🧠 CONTEXTO GLOBAL (ESTADO DE CHAMADOS + AUTENTICAÇÃO)
// ============================================================
const ChamadosContext = createContext();

function ChamadosProvider({ children }) {
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  const carregarChamados = async () => {
    try {
      setCarregando(true);
      const dados = await chamadosService.buscarTodos();
      setChamados(dados);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar os chamados.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (usuarioLogado) {
      carregarChamados();
    }
  }, [usuarioLogado]);

  const addChamado = async (novo) => {
    try {
      await chamadosService.inserir(novo);
      await carregarChamados();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar o chamado.");
    }
  };

  const mudarStatusChamado = async (id, novoStatus) => {
    try {
      await chamadosService.atualizarStatus(id, novoStatus);
      await carregarChamados();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível alterar o status.");
    }
  };

  const realizarLogin = (email, senha) => {
    if (email === "aleportilho25@gmail.com" && senha === "123456@") {
      setUsuarioLogado({ email, nome: "Alessandro (Usuário)", role: "usuario" });
      return true;
    } else if (email === "aleportilhoti@gmail.com" && senha === "12345678@") {
      setUsuarioLogado({ email, nome: "Alessandro (Técnico)", role: "tecnico" });
      return true;
    }
    return false;
  };

  const realizarLogout = () => {
    setUsuarioLogado(null);
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
        realizarLogout 
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
        <Text style={loginStyles.logo}>HelpDesk TI</Text>
        <Text style={loginStyles.welcome}>Ambiente de Validação de Papéis</Text>

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
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Acessar Painel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// 🏠 HOME SCREEN (VISÕES SEPARADAS)
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <Text style={styles.title}>Olá, {usuarioLogado?.nome}</Text>
        <Text style={styles.subtitle}>Painel Nível: {usuarioLogado?.role.toUpperCase()}</Text>

        <View style={styles.cardsRow}>
          <View style={styles.infoCard}><Text style={styles.cardNum}>{contar("Aberto")}</Text><Text style={styles.cardLab}>Abertos</Text></View>
          <View style={styles.infoCard}><Text style={styles.cardNum}>{contar("Em Progresso")}</Text><Text style={styles.cardLab}>No Prazo</Text></View>
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
            <Text style={filtro === f ? { color: "#fff" } : { color: "#000" }}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtrar()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "bold", fontSize: 16 }}>{item.titulo}</Text>
              <Text style={[styles.statusTag, { backgroundColor: item.status === "Resolvido" ? "#d4edda" : item.status === "Em Progresso" ? "#fff3cd" : "#f8d7da" }]}>
                {item.status}
              </Text>
            </View>
            <Text style={{ color: "#666", marginVertical: 6 }}>{item.descricao}</Text>
            
            {usuarioLogado?.role === "tecnico" && (
              <View style={styles.adminActions}>
                {item.status !== "Em Progresso" && item.status !== "Resolvido" && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#ffc107" }]} onPress={() => mudarStatusChamado(item.id, "Em Progresso")}>
                    <Text style={{ fontSize: 11, fontWeight: "bold" }}>Atender</Text>
                  </TouchableOpacity>
                )}
                {item.status !== "Resolvido" && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#28a745" }]} onPress={() => mudarStatusChamado(item.id, "Resolvido")}>
                    <Text style={{ fontSize: 11, color: "#fff", fontWeight: "bold" }}>Fechar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      />

      {usuarioLogado?.role === "usuario" && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("NovoChamado")}>
          <Text style={{ color: "#fff", fontSize: 28 }}>+</Text>
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
      categoria: "Sistemas",
      prioridade: "Média",
      nome: usuarioLogado.nome,
      status: "Aberto"
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: "#fff" }}>
      <Text style={{ fontWeight: "bold" }}>Título do Problema</Text>
      <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} />
      <Text style={{ fontWeight: "bold", marginTop: 15 }}>Descrição Detalhada</Text>
      <TextInput style={[styles.input, { height: 100 }]} multiline value={descricao} onChangeText={setDescricao} />
      <TouchableOpacity style={styles.botao} onPress={criar}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Enviar para a TI</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ============================================================
// 👤 PERFIL SCREEN (LOGOUT SEGURO)
// ============================================================
function PerfilScreen() {
  const { usuarioLogado, realizarLogout } = useChamados();
  return (
    <SafeAreaView style={styles.center}>
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>{usuarioLogado?.nome}</Text>
      <Text style={{ color: "#666" }}>{usuarioLogado?.email}</Text>
      <TouchableOpacity style={[styles.botao, { backgroundColor: "#dc3545", width: "80%", marginTop: 40 }]} onPress={realizarLogout}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Fazer Logout (Trocar Conta)</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ============================================================
// 🧭 NAVEGAÇÃO E FLUXO DINÂMICO
// ============================================================
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Painel" component={HomeScreen} />
      <Tab.Screen name="Minha Conta" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

// 🌐 GERENCIADOR CENTRAL DE FLUXO (RESOLVE O CONGELAMENTO)
function RootNavigator() {
  const { usuarioLogado } = useChamados();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {usuarioLogado == null ? (
        // Se não está logado, a única tela que existe é o Login
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        // Se logou, o app monta o painel e destrói a tela de login da memória
        <>
          <Stack.Screen name="Main" component={Tabs} />
          <Stack.Screen name="NovoChamado" component={NovoChamadoScreen} options={{ headerShown: true, title: "Abrir Chamado" }} />
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
// 🎨 ESTILOS
// ============================================================
const loginStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2d5be3", justifyContent: "center", alignItems: "center" },
  box: { backgroundColor: "#fff", width: "85%", padding: 25, borderRadius: 15, elevation: 5 },
  logo: { fontSize: 26, fontWeight: "bold", color: "#2d5be3", textAlign: "center" },
  welcome: { fontSize: 12, color: "#666", textAlign: "center", marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 8, marginBottom: 12, backgroundColor: "#fafafa" },
  btn: { backgroundColor: "#2d5be3", padding: 15, borderRadius: 8, alignItems: "center", marginTop: 10 }
});

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  header: { backgroundColor: "#2d5be3", padding: 20 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  subtitle: { color: "#ddd", marginBottom: 15, fontSize: 12 },
  cardsRow: { flexDirection: "row", justifyContent: "space-between" },
  infoCard: { backgroundColor: "#4b77f3", padding: 10, borderRadius: 10, width: width / 3.5 },
  cardNum: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cardLab: { color: "#fff", fontSize: 12 },
  filtros: { flexDirection: "row", justifyContent: "space-around", padding: 10, backgroundColor: "#f8f9fa" },
  filtroBtn: { padding: 8, backgroundColor: "#e9ecef", borderRadius: 20, minWidth: 70, alignItems: "center" },
  filtroAtivo: { backgroundColor: "#2d5be3" },
  card: { backgroundColor: "#fff", margin: 10, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: "#eee", elevation: 1 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, fontSize: 11, fontWeight: "bold", overflow: "hidden" },
  adminActions: { flexDirection: "row", marginTop: 10, justifyContent: "flex-end" },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, marginLeft: 8, borderRadius: 5 },
  fab: { position: "absolute", right: 20, bottom: 20, backgroundColor: "#2d5be3", width: 55, height: 55, borderRadius: 28, justifyContent: "center", alignItems: "center", elevation: 4 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginTop: 5 },
  botao: { backgroundColor: "#2d5be3", padding: 15, marginTop: 20, borderRadius: 8, alignItems: "center" }
});