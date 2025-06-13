import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';

//These values need tocome from Firbase once set up. srh. 
const appId = process.env.REACT_APP_APP_ID || "PLACEHOLDER_APP_ID";
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG
  ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG)
  : {
      apiKey: "PLACEHOLDER_API_KEY",
      authDomain: "PLACEHOLDER_AUTH_DOMAIN",
      // ...other config properties
    };
const initialAuthToken = process.env.REACT_APP_INITIAL_AUTH_TOKEN || "PLACEHOLDER_AUTH_TOKEN";



// Define context for Firebase and User
const AppContext = createContext(null);

// Main App component
const App = () => {
  const [activeSection, setActiveSection] = useState('home'); // Controls which section is visible
  const [cartItems, setCartItems] = useState([]); // Stores items in the shopping cart
  const [artworks, setArtworks] = useState([]); // Stores fetched artwork data
  const [artistInfo, setArtistInfo] = useState(null); // Stores fetched artist information
  const [db, setDb] = useState(null); // Firestore instance
  const [auth, setAuth] = useState(null); // Firebase Auth instance
  const [userId, setUserId] = useState(null); // Current user ID
  const [isAuthReady, setIsAuthReady] = useState(true); // Flag for authentication readiness set to true for testing srh.

  // Initialize Firebase and set up authentication listener
  useEffect(() => {
    try {
      // Access global variables provided by the Canvas environment.
      // For local development or other hosting, you'd define these
      // as environment variables or load them from a config file.
      const appId = typeof appId !== 'undefined' ? appId : 'default-app-id';
      const firebaseConfig = typeof firebaseConfig !== 'undefined' ? JSON.parse(firebaseConfig) : {};
      const initialAuthToken = typeof initialAuthToken !== 'undefined' ? initialAuthToken : null;

      // Initialize Firebase app
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      // Listen for authentication state changes
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          // User is signed in
          setUserId(user.uid);
        } else {
          // User is signed out, sign in anonymously if no custom token is provided
          if (!initialAuthToken) {
            try {
              const anonymousUserCredential = await signInAnonymously(firebaseAuth);
              setUserId(anonymousUserCredential.user.uid);
            } catch (error) {
              console.error("Error signing in anonymously:", error);
            }
          }
        }
        setIsAuthReady(true); // Mark authentication as ready
      });

      // If a custom auth token is provided, sign in with it
      if (initialAuthToken) {
        signInWithCustomToken(firebaseAuth, initialAuthToken)
          .then(() => {
            console.log("Signed in with custom token.");
          })
          .catch((error) => {
            console.error("Error signing in with custom token:", error);
          });
      }

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
    }
  }, []); // Empty dependency array means this runs once on mount

  // Fetch data from Firestore once authentication is ready
  useEffect(() => {
    if (!db || !auth || !isAuthReady) return; // Wait for Firebase to be initialized and auth ready

    const fetchArtistInfo = async () => {
      // Define the path for public artist info
      // Uses 'appId' which is provided by the Canvas environment.
      // For external hosting, ensure 'appId' is correctly defined based on your environment.
      const artistInfoDocRef = doc(db, `artifacts/${typeof appId !== 'undefined' ? appId : 'default-app-id'}/public/data/artistInfo`, 'Alayna');

      // Set up a real-time listener for artist info
      const unsubscribeArtistInfo = onSnapshot(artistInfoDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setArtistInfo(docSnap.data());
        } else {
          console.log("No artist info found, setting default.");
          // Initialize default artist info if it doesn't exist
          setDoc(artistInfoDocRef, {
            bioText: "Hi! I'm Alayna, a teenage artist who loves to draw anime-style art. My journey started with a pencil and a dream, and now I'm here to share my passion with you! Explore my digital drawings and coloring books.",
            youtubeUrl: "https://www.youtube.com/@pheoart",
            pinterestUrl: "https://www.pinterest.com/yourpinterestaccount/" // Placeholder, update if user provides
          });
        }
      }, (error) => {
        console.error("Error fetching artist info:", error);
      });
      return unsubscribeArtistInfo;
    };

    const fetchArtworks = async () => {
      // Define the path for public artworks
      // Uses 'appId' which is provided by the Canvas environment.
      // For external hosting, ensure 'appId' is correctly defined based on your environment.
      const artworksCollectionRef = collection(db, `artifacts/${typeof appId !== 'undefined' ? appId : 'default-app-id'}/public/data/artworks`);

      // Set up a real-time listener for artworks
      const unsubscribeArtworks = onSnapshot(artworksCollectionRef, (snapshot) => {
        const fetchedArtworks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setArtworks(fetchedArtworks);

        // If no artworks exist, add some sample data
        if (fetchedArtworks.length === 0) {
          console.log("No artworks found, adding sample data.");
          const sampleArtworks = [
            {
              id: "anime-girl-dream",
              name: "Anime Girl Dream",
              description: "A whimsical digital drawing of an anime girl dreaming under a starlit sky.",
              price: 15.00,
              imageUrl: "https://placehold.co/400x500/A06AB4/FFF?text=Anime+Dream",
              downloadUrl: "https://example.com/downloads/anime-girl-dream.zip",
              category: "drawing"
            },
            {
              id: "fantasy-coloring-book",
              name: "Fantasy World Coloring Book",
              description: "A digital coloring book filled with magical creatures and enchanting landscapes.",
              price: 12.00,
              imageUrl: "https://placehold.co/400x500/6A7FB4/FFF?text=Coloring+Book",
              downloadUrl: "https://example.com/downloads/fantasy-coloring-book.zip",
              category: "coloring-book"
            },
            {
              id: "cyberpunk-city",
              name: "Cyberpunk Cityscape",
              description: "A vibrant digital painting of a futuristic cyberpunk city at night.",
              price: 18.00,
              imageUrl: "https://placehold.co/400x500/6AB4A0/FFF?text=Cyberpunk+City",
              downloadUrl: "https://example.com/downloads/cyberpunk-city.zip",
              category: "drawing"
            },
            {
              id: "chibi-animals",
              name: "Chibi Animal Coloring Fun",
              description: "An adorable digital coloring book featuring cute chibi animals.",
              price: 10.00,
              imageUrl: "https://placehold.co/400x500/B4A06A/FFF?text=Chibi+Animals",
              downloadUrl: "https://example.com/downloads/chibi-animals.zip",
              category: "coloring-book"
            }
          ];

          sampleArtworks.forEach(async (artwork) => {
            try {
              await setDoc(doc(artworksCollectionRef, artwork.id), artwork);
            } catch (e) {
              console.error("Error adding sample artwork:", e);
            }
          });
        }
      }, (error) => {
        console.error("Error fetching artworks:", error);
      });
      return unsubscribeArtworks;
    };

    // Call fetch functions
    const unsubscribeArtist = fetchArtistInfo();
    const unsubscribeArt = fetchArtworks();

    // Cleanup listeners on unmount
    return () => {
      unsubscribeArtist();
      unsubscribeArt();
    };
  }, [db, auth, isAuthReady]); // Re-run when db, auth, or auth readiness changes

  // Function to add item to cart
  const addToCart = (artwork) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === artwork.id);
      if (existingItem) {
        // If item already in cart, increment quantity
        return prevItems.map(item =>
          item.id === artwork.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        // Otherwise, add new item with quantity 1
        return [...prevItems, { ...artwork, quantity: 1 }];
      }
    });
    setActiveSection('cart'); // Navigate to cart after adding item
  };

  // Function to remove item from cart
  const removeFromCart = (id) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  // Function to update item quantity in cart
  const updateQuantity = (id, newQuantity) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity: Math.max(1, newQuantity) } : item
      )
    );
  };

  const handleCheckout = () => {
    // In a real application, this would involve payment processing.
    // For this demo, we'll just simulate a successful purchase.
    // IMPORTANT: For a production app, use a custom modal for user feedback instead of window.alert
    window.alert("Thank you for your purchase! Your digital downloads will be sent to your email.");
    setCartItems([]); // Clear the cart
    setActiveSection('home'); // Go back to home page
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 font-inter text-gray-800">
        <div className="text-2xl font-bold text-purple-600 animate-pulse">Loading Alayna's Art Shop...</div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ db, auth, userId, artworks, artistInfo, addToCart, removeFromCart, updateQuantity, cartItems, setCartItems, setActiveSection }}>
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 font-inter text-gray-800 flex flex-col">
        {/* Header Section */}
        <header className="bg-gradient-to-r from-purple-600 to-pink-500 text-white p-4 shadow-lg sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-4xl font-extrabold tracking-tight cursor-pointer" onClick={() => setActiveSection('home')}>
              Alayna's Art
            </h1>
            <nav className="space-x-6 flex items-center">
              <NavLink text="Home" onClick={() => setActiveSection('home')} />
              <NavLink text="Gallery" onClick={() => setActiveSection('gallery')} />
              <NavLink text="About Alayna" onClick={() => setActiveSection('about')} />
              <div className="relative">
                <button onClick={() => setActiveSection('cart')} className="flex items-center space-x-1 p-2 rounded-full hover:bg-pink-600 transition duration-300">
                  {/* Cart Icon - using an SVG for customizability */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>
            </nav>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-6">
          {/* Render different sections based on activeSection state */}
          {activeSection === 'home' && <HomeSection setActiveSection={setActiveSection} />}
          {activeSection === 'gallery' && <GallerySection />}
          {activeSection === 'about' && <AboutSection />}
          {activeSection === 'cart' && <CartSection onCheckout={handleCheckout} />}
        </main>

        {/* Footer Section */}
        <footer className="bg-gray-800 text-white p-6 text-center shadow-inner mt-8">
          <div className="container mx-auto">
            <p className="mb-4">&copy; {new Date().getFullYear()} Alayna's Art. All rights reserved.</p>
            {artistInfo && (
              <div className="flex justify-center space-x-6">
                <a href={artistInfo.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-red-500 transition duration-300 text-lg">
                  {/* YouTube Icon SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 inline-block" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.001 7.001c-2.761 0-5 2.239-5 5s2.239 5 5 5 5-2.239 5-5-2.239-5-5-5zm0 8.001c-1.654 0-3-1.346-3-3s1.346-3 3-3 3 1.346 3 3-1.346 3-3 3z"/><path d="M19.999 4.001c-1.258-.006-2.515-.008-3.773-.008-2.658 0-3.989.043-4.269.186-.339.172-.499.584-.599.851-.122.327-.156.762-.164 1.25-.008.489-.009.978-.009 1.467v6c0 .489.001.978.009 1.467.008.488.042.923.164 1.25.1.267.26.679.599.851.28.143 1.611.186 4.269.186 1.258 0 2.515 0 3.773-.008 2.658-.006 3.989-.043 4.269-.186.339-.172.499-.584.599-.851.122-.327.156-.762.164-1.25.008-.489.009-.978.009-1.467v-6c0-.489-.001-.978-.009-1.467-.008-.488-.042-.923-.164-1.25-.1-.267-.26-.679-.599-.851-.28-.143-1.611-.186-4.269-.186zm2.001 7c0 .138-.001.275-.002.413-.002.137-.005.275-.008.412h-2c-.004-.137-.007-.275-.009-.412-.002-.138-.002-.275-.002-.413v-1c0-.138.001-.275.002-.413.002-.137.005-.275.008-.412h2c.004.137.007.275.009.412.002.138.002.275.002.413v1zm-2 2c0-.138-.001-.275-.002-.413-.002-.137-.005-.275-.008-.412h-2c-.004.137-.007-.275-.009-.412-.002-.138-.002-.275-.002-.413v-1c0-.138.001-.275.002-.413.002-.137.005-.275.008-.412h2c.004.137.007.275.009.412.002.138.002.275.002.413v1zm-2 2c0 .138-.001-.275-.002.413-.002.137-.005-.275-.008.412h-2c-.004-.137-.007-.275-.009-.412-.002-.138-.002-.275-.002-.413v-1c0-.138.001-.275.002-.413.002-.137.005-.275.008-.412h2c.004.137.007.275.009.412.002.138.002.275.002.413v1zm-2 2c0-.138-.001-.275-.002-.413-.002-.137-.005-.275-.008-.412h-2c-.004.137-.007-.275-.009-.412-.002-.138-.002-.275-.002-.413v-1c0-.138.001-.275.002-.413.002-.137.005-.275.008-.412h2c.004.137.007.275.009.412.002.138.002.275.002.413v1zm-2 2c0 .138-.001.275-.002.413-.002.137-.005.275-.008.412h-2c-.004-.137-.007-.275-.009-.412-.002-.138-.002-.275-.002-.413v-1c0-.138.001-.275.002-.413.002-.137.005-.275.008-.412h2c.004.137.007.275.009.412.002.138.002.275.002.413v1z"/>
                  </svg>
                  YouTube
                </a>
                <a href={artistInfo.pinterestUrl} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-red-700 transition duration-300 text-lg">
                  {/* Pinterest Icon SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 inline-block" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.001 0C5.372 0 0 5.372 0 12.001c0 5.927 4.316 10.835 9.998 11.758-.001-.001 0 0 0 0V15.001h-2.999c-.552 0-1 .448-1 1v2h1.999c.552 0 1-.448 1-1v-2c0-.552-.448-1-1-1h-1.999v-2.001c0-.552.448-1 1-1h3.001v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1V5.001h-2.001c-.552 0-1 .448-1 1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1V.001h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001z"/></svg>
                  <span>Pinterest</span>
                </a>
              </div>
            )}
            <p className="mt-4 text-sm">User ID: {userId || 'Not available'}</p>
          </div>
        </footer>
      </div>
    </AppContext.Provider>
  );
};

// NavLink component for header navigation
const NavLink = ({ text, onClick }) => (
  <button
    onClick={onClick}
    className="text-lg font-semibold hover:text-yellow-300 transition duration-300 py-2 px-3 rounded-md hover:bg-pink-600"
  >
    {text}
  </button>
);

// Home Section Component
const HomeSection = ({ setActiveSection }) => {
  const { artworks, artistInfo } = useContext(AppContext);

  // Filter for only 'drawing' category or first few items
  const featuredArtworks = artworks.filter(art => art.category === 'drawing').slice(0, 3);
  const featuredColoringBooks = artworks.filter(art => art.category === 'coloring-book').slice(0, 3);

  return (
    <section className="text-center py-12">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-300 to-pink-300 rounded-2xl shadow-xl p-12 mb-16 overflow-hidden">
        {/* Animated background elements (simple circles/stars for anime vibe) */}
        <div className="absolute top-1/4 left-1/4 w-24 h-24 bg-white opacity-20 rounded-full animate-bounce-slow"></div>
        <div className="absolute bottom-1/3 right-1/4 w-16 h-16 bg-yellow-200 opacity-20 rounded-full animate-spin-slow"></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-purple-200 opacity-20 rounded-full animate-pulse-slow"></div>

        <h2 className="text-6xl font-extrabold text-purple-800 mb-4 animate-fade-in-down">
          Welcome to Alayna's Art!
        </h2>
        <p className="text-2xl text-gray-700 mb-8 animate-fade-in">
          Unleash Your Inner Artist with Unique Digital Creations!
        </p>
        <button
          onClick={() => setActiveSection('gallery')}
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-4 px-8 rounded-full text-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 hover:rotate-2 animate-bounce-once"
        >
          Explore the Gallery
        </button>
      </div>

      {/* Featured Drawings Section */}
      <div className="mb-16">
        <h3 className="text-4xl font-bold text-purple-700 mb-8">Featured Drawings</h3>
        {featuredArtworks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredArtworks.map(artwork => (
              <ProductCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No featured drawings available yet. Check back soon!</p>
        )}
      </div>

      {/* Featured Coloring Books Section */}
      <div className="mb-16">
        <h3 className="text-4xl font-bold text-pink-700 mb-8">Featured Coloring Books</h3>
        {featuredColoringBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredColoringBooks.map(artwork => (
              <ProductCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No featured coloring books available yet. Check back soon!</p>
        )}
      </div>

      {/* "Go Viral" Call to Action */}
      <div className="bg-yellow-100 rounded-xl p-8 shadow-md border-2 border-yellow-300 animate-pulse-light">
        <h3 className="text-3xl font-bold text-yellow-700 mb-4">Love Alayna's Art? Share it!</h3>
        <p className="text-lg text-gray-700 mb-6">Help us spread the creativity far and wide!</p>
        <div className="flex justify-center space-x-6">
          {/* Social Share Buttons (Placeholder functionality, actual sharing uses browser APIs or share links) */}
          <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg shadow-md transition duration-300 transform hover:scale-105 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3 8h-2v4h-2v-4H9V8h6v2z"/></svg>
            <span>Share on X</span>
          </button>
          <button className="bg-blue-800 hover:bg-blue-900 text-white py-3 px-6 rounded-lg shadow-md transition duration-300 transform hover:scale-105 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v10h5V12h3l1-4h-4V6.25c0-.966.388-1.25 1-1.25h3V0H9v4c-1.66 0-3 1.34-3 3v1z"/></svg>
            <span>Share on Facebook</span>
          </button>
          <a href={artistInfo?.pinterestUrl || "#"} target="_blank" rel="noopener noreferrer" className="bg-red-700 hover:bg-red-800 text-white py-3 px-6 rounded-lg shadow-md transition duration-300 transform hover:scale-105 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.001 0C5.372 0 0 5.372 0 12.001c0 5.927 4.316 10.835 9.998 11.758-.001-.001 0 0 0 0V15.001h-2.999c-.552 0-1 .448-1 1v2h1.999c.552 0 1-.448 1-1v-2c0-.552-.448-1-1-1h-1.999v-2.001c0-.552.448-1 1-1h3.001v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1V5.001h-2.001c-.552 0-1 .448-1 1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1V.001h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001z"/></svg>
            <span>Pin It</span>
          </a>
        </div>
      </div>
    </section>
  );
};

// Gallery Section Component
const GallerySection = () => {
  const { artworks } = useContext(AppContext);
  const [filterCategory, setFilterCategory] = useState('all'); // State for filtering products

  const filteredArtworks = filterCategory === 'all'
    ? artworks
    : artworks.filter(artwork => artwork.category === filterCategory);

  return (
    <section className="py-12">
      <h2 className="text-5xl font-extrabold text-center text-purple-700 mb-12">
        My Digital Masterpieces
      </h2>

      {/* Category Filter Buttons */}
      <div className="flex justify-center mb-10 space-x-4">
        <FilterButton label="All Art" active={filterCategory === 'all'} onClick={() => setFilterCategory('all')} />
        <FilterButton label="Drawings" active={filterCategory === 'drawing'} onClick={() => setFilterCategory('drawing')} />
        <FilterButton label="Coloring Books" active={filterCategory === 'coloring-book'} onClick={() => setFilterCategory('coloring-book')} />
      </div>

      {/* Artwork Grid */}
      {filteredArtworks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredArtworks.map(artwork => (
            <ProductCard key={artwork.id} artwork={artwork} />
          ))}
        </div>
      ) : (
        <p className="text-center text-xl text-gray-600 mt-16">No artworks available in this category yet. Check back soon!</p>
      )}
    </section>
  );
};

// Filter Button Component
const FilterButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`py-3 px-6 rounded-full text-lg font-semibold transition duration-300 ease-in-out transform
      ${active
        ? 'bg-purple-600 text-white shadow-md hover:scale-105'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
      }`}
  >
    {label}
  </button>
);


// Product Card Component
const ProductCard = ({ artwork }) => {
  const { addToCart } = useContext(AppContext);
  const [showDetails, setShowDetails] = useState(false); // State to toggle product details

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden group">
      <img
        src={artwork.imageUrl}
        alt={artwork.name}
        className="w-full h-72 object-cover rounded-t-xl"
        onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x500/A06AB4/FFF?text=Image+Error`; }} // Fallback image
      />
      <div className="p-5">
        <h3 className="text-2xl font-bold text-purple-700 mb-2">{artwork.name}</h3>
        <p className="text-gray-600 text-lg mb-4">${artwork.price.toFixed(2)}</p>

        {/* Short description on card, full description in modal */}
        <p className="text-gray-700 mb-4 text-sm line-clamp-2">{artwork.description}</p>

        <div className="flex flex-col space-y-3">
          <button
            onClick={() => addToCart(artwork)}
            className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-6 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add to Cart</span>
          </button>
          <button
            onClick={() => setShowDetails(true)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>View Details</span>
          </button>
        </div>
      </div>

      {/* Product Details Modal */}
      {showDetails && (
        <ProductDetailsModal artwork={artwork} onClose={() => setShowDetails(false)} />
      )}
    </div>
  );
};

// Product Details Modal Component
const ProductDetailsModal = ({ artwork, onClose }) => {
  const { addToCart } = useContext(AppContext);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full relative transform transition-all duration-300 scale-100 opacity-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl font-bold transition duration-200"
        >
          &times;
        </button>
        <div className="flex flex-col md:flex-row gap-6">
          <img
            src={artwork.imageUrl}
            alt={artwork.name}
            className="w-full md:w-1/2 h-80 object-cover rounded-lg shadow-md"
            onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x500/A06AB4/FFF?text=Image+Error`; }}
          />
          <div className="flex-1">
            <h3 className="text-3xl font-extrabold text-purple-800 mb-3">{artwork.name}</h3>
            <p className="text-pink-600 text-2xl font-semibold mb-4">${artwork.price.toFixed(2)}</p>
            <p className="text-gray-700 text-base leading-relaxed mb-6">{artwork.description}</p>
            <button
              onClick={() => { addToCart(artwork); onClose(); }}
              className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add to Cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// About Section Component
const AboutSection = () => {
  const { artistInfo } = useContext(AppContext);

  return (
    <section className="py-12 text-center">
      <h2 className="text-5xl font-extrabold text-purple-700 mb-10">
        About Alayna's Artistic Journey
      </h2>
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-xl p-8 border-l-4 border-pink-500 text-left">
        {artistInfo ? (
          <>
            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              {artistInfo.bioText}
            </p>
            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              You can also follow my creative process and get behind-the-scenes looks on my social media:
            </p>
            <div className="flex justify-center space-x-8">
              <a href={artistInfo.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-purple-600 hover:text-red-500 transition duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12.001 7.001c-2.761 0-5 2.239-5 5s2.239 5 5 5 5-2.239 5-5-2.239-5-5-5zm0 8.001c-1.654 0-3-1.346-3-3s1.346-3 3-3 3 1.346 3 3-1.346 3-3 3z"/><path d="M19.999 4.001c-1.258-.006-2.515-.008-3.773-.008-2.658 0-3.989.043-4.269.186-.339.172-.499.584-.599.851-.122.327-.156.762-.164 1.25-.008.489-.009.978-.009 1.467v6c0 .489.001.978.009 1.467.008.488.042.923.164 1.25.1.267.26.679.599.851.28.143 1.611.186 4.269.186 1.258 0 2.515 0 3.773-.008 2.658-.006 3.989-.043 4.269-.186.339-.172.499-.584.599-.851.122-.327.156-.762.164-1.25.008-.489.009-.978.009-1.467v-6c0-.489-.001-.978-.009-1.467-.008-.488-.042-.923-.164-1.25-.1-.267-.26-.679-.599-.851-.28-.143-1.611-.186-4.269-.186zm2.001 7c0 .138-.001.275-.002.413-.002.137-.005.275-.008.412h-2c-.004-.137-.007-.275-.009-.412-.002-.138-.002-.275-.002-.413v-1c0-.138.001-.275.002-.413.002-.137.005-.275.008-.412h2c.004.137.007.275.009.412.002.138.002.275.002.413v1zm-2 2c0-.138-.001-.275-.002-.413-.002.137-.005-.275-.008-.412h-2c-.004.137-.007-.275-.009-.412-.002-.138-.002-.275-.002-.413v-1c0-.138.001-.275.002-.413.002-.137.005-.275.008-.412h2c.004.137.007.275.009.412.002.138.002.275.002.413v1zm-2 2c0 .138-.001-.275-.002.413-.002.137-.005-.275-.008.412h-2c-.004-.137-.007-.275-.009-.412-.002-.138-.002-.275-.002-.413v-1c0-.138.001-.275.002-.413.002-.137.005-.275.008-.412h2c.004.137.007.275.009.412.002.138.002.275.002.413v1zm-2 2c0-.138-.001-.275-.002-.413-.002.137-.005-.275-.008-.412h-2c-.004.137-.007-.275-.009-.412-.002-.138-.002-.275-.002-.413v-1c0-.138.001-.275.002-.413.002-.137.005-.275.008-.412h2c.004.137.007.275.009.412.002.138.002.275.002.413v1zm-2 2c0 .138-.001.275-.002.413-.002.137-.005.275-.008.412h-2c-.004-.137-.007-.275-.009-.412-.002-.138-.002-.275-.002-.413v-1c0-.138.001-.275.002-.413.002-.137.005-.275.008-.412h2c.004.137.007.275.009.412.002.138.002.275.002.413v1z"/></svg>
                <span className="mt-2 text-lg">YouTube</span>
              </a>
              <a href={artistInfo.pinterestUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-purple-600 hover:text-red-700 transition duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12.001 0C5.372 0 0 5.372 0 12.001c0 5.927 4.316 10.835 9.998 11.758-.001-.001 0 0 0 0V15.001h-2.999c-.552 0-1 .448-1 1v2h1.999c.552 0 1-.448 1-1v-2c0-.552-.448-1-1-1h-1.999v-2.001c0-.552.448-1 1-1h3.001v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1V5.001h-2.001c-.552 0-1 .448-1 1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1V.001h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001c.552 0 1-.448 1-1v-2.999c0-.552-.448-1-1-1h-2.001c-.552 0-1-.448-1-1v-2.001c0-.552.448-1 1-1h2.001z"/></svg>
                <span className="mt-2 text-lg">Pinterest</span>
              </a>
            </div>
          </>
        ) : (
          <p className="text-gray-600">Loading artist information...</p>
        )}
      </div>
    </section>
  );
};

// Cart Section Component
const CartSection = ({ onCheckout }) => {
  const { cartItems, removeFromCart, updateQuantity } = useContext(AppContext);

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <section className="py-12">
      <h2 className="text-5xl font-extrabold text-center text-purple-700 mb-10">
        Your Cart
      </h2>
      {cartItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md mx-auto">
          <p className="text-xl text-gray-600 mb-4">Your cart is empty!</p>
          <p className="text-gray-500">Add some amazing digital art to get started.</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl p-8">
          <div className="space-y-6 mb-8">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center space-x-6 border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-lg shadow-md"
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/100x100/D1D5DB/FFF?text=Image`; }}
                />
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-gray-800">{item.name}</h3>
                  <p className="text-gray-600">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-300 transition"
                  >
                    -
                  </button>
                  <span className="text-lg font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="bg-gray-200 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-300 transition"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:text-red-700 transition duration-300"
                >
                  {/* Trash Can Icon SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="text-right text-3xl font-bold text-purple-700 mb-8">
            Subtotal: ${subtotal.toFixed(2)}
          </div>

          <button
            onClick={onCheckout}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-full text-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 w-full"
          >
            Proceed to Checkout
          </button>
        </div>
      )}
    </section>
  );
};

// Export the main App component as default
export default App;
