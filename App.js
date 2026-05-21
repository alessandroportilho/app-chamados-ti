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

// Imports de Navegação atualizados para a nova geração do React Native
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
// 💾 CAMADA DE SERVIÇO (CONECTADA AO FIRESTORE)
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
      console.error("Erro ao buscar chamados: ", error);
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
      console.error("Erro ao inserir chamado: ", error);
      throw error;
    }
  },

  atualizarStatus: async (id, novoStatus) => {
    try {
      const chamadoRef = doc(db, "chamados", id);
      await updateDoc(chamadoRef, { status: novoStatus });
      return { id, status: novoStatus };
    } catch (error) {
      console.error("Erro ao atualizar status: ", error);
      throw error;
    }
  }
};

// ============================================================
// 🧠 CONTEXTO (GERENCIAMENTO DE ESTADO GLOBAL)
// ============================================================
const ChamadosContext = createContext();

function ChamadosProvider({ children }) {
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregarChamados = async () => {
    try {
      setCarregando(true);
      const dados = await chamadosService.buscarTodos();
      setChamados(dados);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar os chamados do banco.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarChamados();
  }, []);

  const addChamado = async (novo) => {
    try {
      await chamadosService.inserir(novo);
      await carregarChamados();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar o chamado no banco.");
    }
  };

  const mudarStatusChamado = async (id, novoStatus) => {
    try {
      await chamadosService.atualizarStatus(id, novoStatus);
      await carregarChamados();
      Alert.alert("Sucesso", `Status atualizado para: ${novoStatus}`);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar o status.");
    }
  };

  return (
    <ChamadosContext.Provider value={{ chamados, carregando, addChamado, mudarStatusChamado }}>
      {children}
    </ChamadosContext.Provider>
  );
}

const useChamados = () => useContext(ChamadosContext);

// ================= NAVEGAÇÃO CONFIG CORRETA =================
const { width } = Dimensions.get("window");
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const InfoCard = ({ numero, label }) => (
  <View style={styles.infoCard}>
    <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>{numero}</Text>
    <Text style={{ color: "#fff", fontSize: 12 }}>{label}</Text>
  </View>
);

// ================= HOME SCREEN =================
function HomeScreen({ navigation }) {
  const { chamados, carregando } = useChamados();
  const [filtro, setFiltro] = useState("Todos");
  const [busca, setBusca] = useState("");

  const filtrar = () => {
    return chamados.filter((c) => {
      const matchFiltro = filtro === "Todos" || c.status === filtro;
      const matchBusca = c.titulo.toLowerCase().includes(busca.toLowerCase());
      return matchFiltro && matchBusca;
    });
  };

  const contar = (status) => chamados.filter((c) => c.status === status).length;

  if (carregando) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2d5be3" />
        <Text style={{ marginTop: 10, color: "#666" }}>Buscando do Firebase...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <Text style={styles.title}>Chamados</Text>
        <Text style={styles.subtitle}>Seus tickets de TI</Text>

        <View style={styles.cardsRow}>
          <InfoCard numero={contar("Aberto")} label="Abertos" />
          <InfoCard numero={contar("Em Progresso")} label="Em Progresso" />
          <InfoCard numero={contar("Resolvido")} label="Resolvidos" />
        </View>

        <TextInput
          placeholder="Buscar chamados..."
          style={styles.search}
          value={busca}
          onChangeText={setBusca}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.filtros}>
        {["Todos", "Aberto", "Em Progresso", "Resolvido"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filtroBtn, filtro === f && styles.filtroAtivo]}
            onPress={() => setFiltro(f)}
          >
            <Text style={filtro === f ? styles.filtroTextoAtivo : styles.filtroTexto}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtrar()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.tituloCard}>{item.titulo}</Text>
            <Text style={styles.descricaoCard}>{item.descricao}</Text>
            <View style={styles.footerCard}>
              <Text style={styles.tag}>{item.categoria}</Text>
              <Text style={styles.tempo}>Prioridade: {item.prioridade || "Média"}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: "#999", marginTop: 40 }}>
            Nenhum chamado registrado.
          </Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("NovoChamado")}>
        <Text style={{ color: "#fff", fontSize: 28 }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ================= NOVO CHAMADO SCREEN =================
function NovoChamadoScreen({ navigation }) {
  const { addChamado } = useChamados();
  
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("Média");
  const [categoria, setCategoria] = useState("Hardware");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);

  const criar = async () => {
    if (!titulo || !descricao) {
      Alert.alert("Aviso", "Por favor, preencha Título e Descrição.");
      return;
    }

    setEnviando(true);
    await addChamado({
      titulo,
      descricao,
      categoria,
      prioridade,
      nome,
      status: "Aberto",
      dias: 0,
    });
    setEnviando(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: "#fff" }}>
      <Text style={styles.label}>Título</Text>
      <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} />

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        multiline
        value={descricao}
        onChangeText={setDescricao}
      />

      <Text style={styles.label}>Prioridade</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {["Baixa", "Média", "Alta", "Crítica"].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.prioridadeBtn, prioridade === p && styles.prioridadeAtivo]}
            onPress={() => setPrioridade(p)}
          >
            <Text style={prioridade === p ? { color: "#fff" } : { color: "#000" }}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Categoria</Text>
      <TextInput style={styles.input} value={categoria} onChangeText={setCategoria} />

      <Text style={styles.label}>Seu Nome</Text>
      <TextInput style={styles.input} value={nome} onChangeText={setNome} />

      <TouchableOpacity style={styles.botao} onPress={criar} disabled={enviando}>
        {enviando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "bold" }}>Criar Chamado</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ================= PERFIL SCREEN =================
function PerfilScreen() {
  const [nome, setNome] = useState("Maria Silva");
  const [email, setEmail] = useState("maria.silva@empresa.com");
  const [telefone, setTelefone] = useState("(11) 98765-4321");
  const [departamento, setDepartamento] = useState("Recursos Humanos");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <View style={perfilStyles.container}>
        <View style={perfilStyles.avatar}>
          <Text style={perfilStyles.avatarText}>{nome.charAt(0).toUpperCase()}</Text>
        </View>

        <Text style={perfilStyles.sectionTitle}>Nome</Text>
        <TextInput style={perfilStyles.input} value={nome} onChangeText={setNome} />

        <Text style={perfilStyles.sectionTitle}>Email</Text>
        <TextInput style={perfilStyles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

        <Text style={perfilStyles.sectionTitle}>Telefone</Text>
        <TextInput style={perfilStyles.input} value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />

        <Text style={perfilStyles.sectionTitle}>Departamento</Text>
        <TextInput style={perfilStyles.input} value={departamento} onChangeText={setDepartamento} />

        <TouchableOpacity style={perfilStyles.botaoSalvar} onPress={() => Alert.alert("Sucesso", "Perfil atualizado!")}>
          <Text style={perfilStyles.botaoTexto}>Salvar Alterações</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ================= COMBINAÇÃO DE ROTAS =================
function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <ChamadosProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="NovoChamado" component={NovoChamadoScreen} options={{ title: "Novo Chamado" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ChamadosProvider>
  );
}

// ================= ESTILOS UNIFICADOS =================
const styles = StyleSheet.create({
  header: { backgroundColor: "#2d5be3", padding: 20 },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  subtitle: { color: "#ddd", marginBottom: 15 },
  cardsRow: { flexDirection: "row", justifyContent: "space-between" },
  infoCard: { backgroundColor: "#4b77f3", padding: 10, borderRadius: 10, width: width / 3.5 },
  search: { backgroundColor: "#fff", borderRadius: 20, marginTop: 10, padding: 10 },
  filtros: { flexDirection: "row", justifyContent: "space-around", padding: 10 },
  filtroBtn: { padding: 10, backgroundColor: "#ddd", borderRadius: 20 },
  filtroAtivo: { backgroundColor: "#2d5be3" },
  filtroTexto: { color: "#000" },
  filtroTextoAtivo: { color: "#fff" },
  card: { backgroundColor: "#fff", margin: 10, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: "#eee" },
  tituloCard: { fontWeight: "bold", fontSize: 16 },
  descricaoCard: { color: "#666", marginTop: 4 },
  footerCard: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, alignItems: "center" },
  tag: { backgroundColor: "#eee", padding: 5, borderRadius: 10, fontSize: 12 },
  tempo: { color: "#999", fontSize: 12 },
  fab: { position: "absolute", right: 20, bottom: 20, backgroundColor: "#2d5be3", width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5 },
  label: { marginTop: 12, fontWeight: "600", color: "#333" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 10, marginTop: 4, backgroundColor: "#fafafa" },
  prioridadeBtn: { padding: 10, borderWidth: 1, margin: 4, borderRadius: 10, borderColor: "#ccc" },
  prioridadeAtivo: { backgroundColor: "#2d5be3", borderColor: "#2d5be3" },
  botao: { backgroundColor: "#2d5be3", padding: 15, marginTop: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", height: 50 },
});

const perfilStyles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#dbe7ff", justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 25 },
  avatarText: { fontSize: 40, fontWeight: "bold", color: "#2d5be3" },
  sectionTitle: { fontSize: 14, marginBottom: 4, marginTop: 12, color: "#555", fontWeight: "600" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, fontSize: 16 },
  botaoSalvar: { backgroundColor: "#2d5be3", marginTop: 25, padding: 16, borderRadius: 12, alignItems: "center" },
  botaoTexto: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});