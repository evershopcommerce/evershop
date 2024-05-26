import React, { useState, useEffect } from "react";

function FeaturedCategories() {
  const initialCategories = [
    { class: "men-cat", img: "/men-banner.webp", alt: "Compre para homens", link: "homem", text: "COMPRE PARA HOMENS" },
    { class: "women-cat", img: "/women-banner.webp", alt: "Compre para mulheres", link: "mulher", text: "COMPRE PARA MULHERES" },
    { class: "kid-cat", img: "/casal.webp", alt: "Compre para casal", link: "casal", text: "COMPRE PARA CASAL" },
    { class: "women-cat", img: "/kid-banner.webp", alt: "Compre para crianças", link: "crianca", text: "COMPRE PARA CRIANÇAS" },
    { class: "women-cat", img: "/fitness.webp", alt: "Compre para fitness", link: "fitness", text: "COMPRE PARA FITNESS" },
    { class: "kid-cat", img: "/acessorios.webp", alt: "Compre para acessórios", link: "acessorios", text: "COMPRE ACESSÓRIOS" },
    { class: "kid-cat", img: "/tenis.webp", alt: "Compre tênis, sapatos & botas", link: "tenis_sapatos_botas", text: "COMPRE TÊNIS, SAPATOS & BOTAS" },
    { class: "women-cat", img: "/bolsas_mochilas_malas.webp", alt: "Compre bolsas, mochilas & malas", link: "bolsas_mochilas_malas", text: "COMPRE BOLSAS, MOCHILAS & MALAS" },
    { class: "kid-cat", img: "/compre_para_sua_beleza_e_bem_estar.webp", alt: "compre para sua beleza e bem-estar", link: "compre_para_sua_beleza_e_bem_estar", text: "COMPRE PARA SUA BELEZA E BEM-ESTAR" },
    { class: "women-cat", img: "/arte_artesanato.webp", alt: "Compre arte & artesanatos", link: "arte_artesanato", text: "COMPRE ARTE & ARTESANATOS" },
    { class: "kid-cat", img: "/tecnologia.webp", alt: "Compre tecnologia", link: "tecnologia", text: "COMPRE TECNOLOGIA" },
    { class: "women-cat", img: "/decoracao.webp", alt: "Compre decoração", link: "decoracao", text: "COMPRE PARA A DECORAÇÃO DA SUA CASA" },
    { class: "women-cat", img: "/alimentos.webp", alt: "Compre alimentos", link: "alimentos", text: "COMPRE ALIMENTOS" },
    { class: "women-cat", img: "/bebidas.webp", alt: "COMPRE BEBIDAS", link: "bebidas", text: "COMPRE BEBIDAS" },
    // Adicione mais categorias conforme necessário
  ];

  const [shuffledCategories, setShuffledCategories] = useState([]);

  useEffect(() => {
    const shuffleCategories = (array) => {
      let currentIndex = array.length, randomIndex;

      // Enquanto houver elementos para embaralhar...
      while (currentIndex !== 0) {

        // Pegue um elemento aleatório...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // E troque-o pelo elemento atual.
        [array[currentIndex], array[randomIndex]] = [
          array[randomIndex], array[currentIndex]];
      }

      return array;
    };

    setShuffledCategories(shuffleCategories([...initialCategories]));
  }, []); // Dependências vazias para executar apenas no montagem do componente

  return (
    <div className="page-width">
      <div className="mb-2 mt-3">
        <h2 className="text-center">NOSSAS CATEGORIAS</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {shuffledCategories.map((category, index) => (
          <div key={index} className={`relative col-span-1 ${category.class} flex flex-col justify-end h-full`}>
            <a href={category.link} className="w-full h-full">
              <img
                src={category.img}
                alt={category.alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-[20px] left-[20px] bg-white px-2 text-center">
                <p className="underline">{category.text}</p>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FeaturedCategories;

export const layout = {
  areaId: "content",
  sortOrder: 5,
};
