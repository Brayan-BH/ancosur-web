"use client";

import Image from "next/image";

import { isOptimizableImage } from "@/src/seo";

import type { ClubBenefit } from "../data/clubBenefits";
import styles from "./ClubBeneficiosPage.module.css";

export default function ClubBeneficiosPage({ beneficios }: { beneficios: ClubBenefit[] }) {
  return (
    <>

      <main className={styles.page}>
        <section className={styles.benefitsSection}>
          <div className={styles.header}>
            <span>BENEFICIOS EXCLUSIVOS</span>

            <h1>
              Disfruta tus beneficios
            </h1>

            <p>
              Presenta tu constancia de compra Ancosur
              y accede a promociones especiales.
            </p>
          </div>

          <div className={styles.grid}>
            {beneficios.map((item) => (
              <article
                key={item.name}
                className={styles.card}
              >
                <div className={styles.imageBox}>
                  <Image
                    src={item.image}
                    alt={`Beneficio Ancosur - ${item.name}`}
                    fill
                    unoptimized={!isOptimizableImage(item.image)}
                    sizes="
                      (max-width: 768px) 100vw,
                      (max-width: 1050px) 50vw,
                      33vw
                    "
                    className={styles.image}
                  />
                </div>

                <div className={styles.content}>
                  <span>
                    {item.category}
                  </span>

                  <h2>
                    {item.name}
                  </h2>

                  <div className={styles.discount}>
                    <strong>
                      {item.discount}
                    </strong>

                    <small>
                      Beneficio Ancosur
                    </small>
                  </div>

                  <p>
                    {item.description}
                  </p>

                  {item.termsHref && (
                    <a
                      href={item.termsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver términos y condiciones
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}