import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface Puja {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  type: "online" | "offline" | "both";
  imageUrl: string;
  category: string;
}

const mockPujas: Puja[] = [
  {
    id: 1,
    name: "Satyanarayan Puja",
    description:
      "A sacred ritual dedicated to Lord Vishnu for peace, prosperity, and fulfillment of wishes.",
    price: 3500,
    duration: 120,
    type: "both",
    imageUrl:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
    category: "Prosperity",
  },
  {
    id: 2,
    name: "Ganesh Puja",
    description:
      "Worship of Lord Ganesha, the remover of obstacles and god of new beginnings.",
    price: 2500,
    duration: 90,
    type: "both",
    imageUrl:
      "https://images.unsplash.com/photo-1587135941948-670b381f08ce?w=400&h=300&fit=crop",
    category: "New Beginnings",
  },
  {
    id: 3,
    name: "Lakshmi Puja",
    description:
      "Devotion to Goddess Lakshmi for wealth, fortune, and prosperity.",
    price: 4000,
    duration: 120,
    type: "both",
    imageUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    category: "Wealth",
  },
  {
    id: 4,
    name: "Griha Pravesh Puja",
    description: "House warming ceremony to purify and bless your new home.",
    price: 5500,
    duration: 180,
    type: "offline",
    imageUrl: "/images/grihapraveshpuja.png",
    category: "Home",
  },
  {
    id: 5,
    name: "Navagraha Shanti Puja",
    description:
      "Pacification of nine planets to remove doshas and bring harmony.",
    price: 6000,
    duration: 150,
    type: "both",
    imageUrl:
      "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=400&h=300&fit=crop",
    category: "Astrology",
  },
  {
    id: 6,
    name: "Rudrabhishek",
    description:
      "Sacred bathing ritual of Shiva Lingam with holy substances for blessings.",
    price: 4500,
    duration: 120,
    type: "both",
    imageUrl:
      "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=400&h=300&fit=crop",
    category: "Protection",
  },
];

const PujasListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [pujas, setPujas] = useState<Puja[]>(mockPujas);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    "All",
    "Prosperity",
    "Wealth",
    "Home",
    "Protection",
    "Astrology",
    "New Beginnings",
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setPujas(mockPujas);
      setRefreshing(false);
    }, 1000);
  };

  const filteredPujas = pujas.filter((puja) => {
    const matchesSearch =
      puja.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      puja.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory ||
      selectedCategory === "All" ||
      puja.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderPujaCard = (puja: Puja) => (
    <TouchableOpacity key={puja.id} style={styles.pujaCard} activeOpacity={0.7}>
      <Image source={{ uri: puja.imageUrl }} style={styles.pujaImage} />
      <View style={styles.pujaContent}>
        <Text style={styles.pujaName}>{puja.name}</Text>
        <View style={styles.pujaInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.infoText}>{puja.duration} min</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons
              name={
                puja.type === "online"
                  ? "videocam"
                  : puja.type === "offline"
                    ? "location"
                    : "globe"
              }
              size={14}
              color="#6B7280"
            />
            <Text style={styles.infoText}>
              {puja.type === "both"
                ? "Online/In-person"
                : puja.type === "online"
                  ? "Online"
                  : "In-person"}
            </Text>
          </View>
        </View>
        <Text style={styles.pujaDescription} numberOfLines={2}>
          {puja.description}
        </Text>
        <View style={styles.pujaFooter}>
          <Text style={styles.pujaPrice}>₹{puja.price.toLocaleString()}</Text>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <LinearGradient colors={["#3B82F6", "#1D4ED8"]} style={styles.header}>
        <Text style={styles.headerTitle}>All Pujas</Text>
        <Text style={styles.headerSubtitle}>
          Browse our comprehensive collection of traditional pujas
        </Text>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons
            name="search"
            size={20}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pujas..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryPill,
              (selectedCategory === category ||
                (category === "All" && !selectedCategory)) &&
                styles.categoryPillActive,
            ]}
            onPress={() =>
              setSelectedCategory(category === "All" ? null : category)
            }
          >
            <Text
              style={[
                styles.categoryText,
                (selectedCategory === category ||
                  (category === "All" && !selectedCategory)) &&
                  styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
      >
        {filteredPujas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No pujas found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or filter
            </Text>
          </View>
        ) : (
          <View style={styles.pujasList}>
            {filteredPujas.map(renderPujaCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: "#1F2937",
  },
  categoriesContainer: {
    maxHeight: 50,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  categoriesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: "#3B82F6",
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  pujasList: {
    padding: 16,
  },
  pujaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  pujaImage: {
    width: "100%",
    height: 160,
  },
  pujaContent: {
    padding: 16,
  },
  pujaName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  pujaInfo: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: "#6B7280",
  },
  pujaDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  pujaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pujaPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3B82F6",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  viewButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});

export default PujasListScreen;
