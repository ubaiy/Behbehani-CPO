import React from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fontFamily, radius, spacing } from '../../theme/theme';
import { brand, slate } from '../../theme/colors';
import { ListingCard } from '../ListingCard';

type Listing = { id: string; [key: string]: unknown };

type ListingRailProps = {
  title: string;
  seeAllHref: string;
  data: Listing[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRefetch: () => void;
  onSeeAll: () => void;
  skeletonCount?: number;
};

export function ListingRail({
  title,
  data,
  isLoading,
  isError,
  onRefetch,
  onSeeAll,
  skeletonCount = 3,
}: ListingRailProps) {
  return (
    <View style={railStyles.section}>
      <View style={railStyles.header}>
        <Text style={railStyles.title}>{title}</Text>
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={railStyles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={railStyles.scroll}>
          {Array.from({ length: skeletonCount }, (_, i) => (
            <View key={i} style={railStyles.cardWrap}>
              <ListingCard.Skeleton variant="rail" />
            </View>
          ))}
        </ScrollView>
      ) : isError ? (
        <View style={railStyles.errorPill}>
          <Text style={railStyles.errorText}>Could not load listings.</Text>
          <Pressable onPress={onRefetch} hitSlop={8}>
            <Text style={railStyles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          horizontal
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={railStyles.cardWrap}>
              <ListingCard listing={item as never} variant="rail" />
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={railStyles.scroll}
          ListEmptyComponent={
            <View style={railStyles.cardWrap}>
              <ListingCard.Skeleton variant="rail" />
            </View>
          }
        />
      )}
    </View>
  );
}

export const railStyles = StyleSheet.create({
  section: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: slate[900],
  },
  seeAll: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: brand[700],
    minHeight: 44,
    lineHeight: 44,
  },
  scroll: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  cardWrap: {
    // gap handled via contentContainerStyle gap
  },
  errorPill: {
    marginHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: slate[50],
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: slate[200],
  },
  errorText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: slate[600],
  },
  retryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: brand[700],
    minHeight: 44,
    lineHeight: 44,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: slate[500],
    paddingVertical: spacing[4],
  },
});
