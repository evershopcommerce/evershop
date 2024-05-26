import React from "react";
import "./tailwind.scss";

function CombinedComponent() {
  return (
    <div className="page-width">
      <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x border-divider border my-3">
        <div className="p-2 border-divider">
          <h2>Frete Grátis</h2>
          <p>Obtenha frete grátis em todos os pedidos acima de 5.000 MT.</p>
        </div>
        <div className="p-2 border-divider">
          <h2>Melhor Preço</h2>
          <p>Oferecemos os melhores preços em todos os nossos produtos.</p>
        </div>
        <div className="p-2 border-divider">
          <h2>Ótimo Atendimento</h2>
          <p>Nosso atendimento ao cliente está disponível 24/7.</p>
        </div>
      </div>
      <img className="mx-auto mt-3 w-[800px] border" src="/yeats_quote.png" alt="Yeats Quote" />
    </div>
  );
}

export default CombinedComponent;

export const layout = {
  areaId: "content",
  sortOrder: 4, // Pode ajustar conforme necessário
};
